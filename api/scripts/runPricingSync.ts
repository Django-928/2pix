/**
 * 一键运行完整价格同步流水线
 *
 * 步骤：
 *   1. fetchKiePricing  - 抓取 kie.ai 上游价格快照
 *   2. buildFromSnapshot - 根据快照更新 pricing_mapping.json
 *   3. syncPricing       - 将更新后的价格写入本地数据库
 *
 * 运行方式：
 *   npx tsx api/scripts/runPricingSync.ts
 *
 * 环境变量：
 *   SKIP_FETCH=1       跳过抓取，直接使用已有快照
 *   SKIP_BUILD=1       跳过映射构建，直接使用已有 pricing_mapping.json
 *   PRICING_MAPPING_PATH
 *   KIE_PRICING_SNAPSHOT_PATH
 *   KIE_PRICING_URL
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchKiePricing } from './fetchKiePricing.js';
import { buildFromSnapshot } from './buildPricingMapping.js';
import { syncPricing } from './syncKiePricing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function ensureLogDir(): string {
  const logDir = path.resolve(__dirname, '../../data/logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function writeJsonLog(name: string, data: unknown) {
  const logDir = ensureLogDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(logDir, `${name}_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return filePath;
}

export async function runPricingSync(options: {
  skipFetch?: boolean;
  skipBuild?: boolean;
} = {}) {
  const skipFetch = options.skipFetch || getEnv('SKIP_FETCH', '0') === '1';
  const skipBuild = options.skipBuild || getEnv('SKIP_BUILD', '0') === '1';

  console.log(`[pipeline] 开始价格同步流水线 (fetch=${!skipFetch}, build=${!skipBuild})`);
  const startedAt = new Date().toISOString();

  let fetchedCount = 0;
  if (!skipFetch) {
    const records = await fetchKiePricing();
    fetchedCount = records.length;
  } else {
    console.log('[pipeline] 跳过抓取');
  }

  if (!skipBuild) {
    const buildReport = await buildFromSnapshot();
    writeJsonLog('build_report', buildReport);
  } else {
    console.log('[pipeline] 跳过映射构建');
  }

  const syncReport = syncPricing();
  writeJsonLog('sync_report', syncReport);

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    fetchedCount,
    updatedCount: syncReport.updated.length,
    skippedCount: syncReport.skipped.length,
    notMatchedCount: syncReport.notMatched.length,
  };

  const summaryPath = writeJsonLog('sync_summary', summary);
  console.log('\n[pipeline] 流水线完成');
  console.log(`  抓取记录: ${fetchedCount}`);
  console.log(`  数据库更新: ${summary.updatedCount}`);
  console.log(`  数据库跳过: ${summary.skippedCount}`);
  console.log(`  数据库无匹配: ${summary.notMatchedCount}`);
  console.log(`  摘要日志: ${summaryPath}`);

  return summary;
}

async function main() {
  try {
    await runPricingSync();
  } catch (err) {
    console.error('[pipeline] 流水线失败:', err);

    // 尝试写失败日志
    try {
      const logDir = ensureLogDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorPath = path.join(logDir, `sync_error_${timestamp}.log`);
      fs.writeFileSync(errorPath, String(err), 'utf-8');
      console.error(`[pipeline] 错误日志: ${errorPath}`);
    } catch {
      // ignore
    }

    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
