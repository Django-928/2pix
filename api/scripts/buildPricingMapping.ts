/**
 * 根据上游价格快照更新 pricing_mapping.json
 *
 * 运行方式：
 *   npx tsx api/scripts/buildPricingMapping.ts
 *
 * 匹配逻辑：
 *   1. 归一化后的 kie_desc 与上游 modelDescription 完全相等
 *   2. 互相包含
 *   3. token 重叠度 >= 0.7
 *
 * 价格更新逻辑：
 *   保持本地 markup 比例不变：new_cost = new_usd * (old_cost / old_usd)
 *   这样上游涨价/降价时，本地售价同比例调整。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KiePricingRecord } from './fetchKiePricing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PricingMappingItem {
  local_model: string;
  category: string;
  display_name: string;
  cost_per_unit: number | null;
  unit_type?: string;
  unit_label?: string;
  kie_desc?: string;
  kie_usd?: number;
  kie_unit?: string;
  kie_credit_price?: number;
  note?: string;
}

export interface BuildReport {
  updated: Array<{
    local_model: string;
    display_name: string;
    old_cost: number | null;
    new_cost: number | null;
    old_usd: number | null;
    new_usd: number;
  }>;
  unchanged: string[];
  notMatched: string[];
}

function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s,\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(normalize(text).split(' '));
}

function tokenOverlapScore(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export function findUpstreamRecord(
  mappingItem: PricingMappingItem,
  records: KiePricingRecord[]
): KiePricingRecord | null {
  if (!mappingItem.kie_desc) return null;

  const targetNorm = normalize(mappingItem.kie_desc);

  // 1. 归一化后精确匹配
  for (const record of records) {
    if (normalize(record.modelDescription) === targetNorm) {
      return record;
    }
  }

  // 2. 互相包含
  for (const record of records) {
    const recordNorm = normalize(record.modelDescription);
    if (recordNorm.includes(targetNorm) || targetNorm.includes(recordNorm)) {
      return record;
    }
  }

  // 3. token 重叠度阈值
  let best: KiePricingRecord | null = null;
  let bestScore = 0;
  for (const record of records) {
    const score = tokenOverlapScore(mappingItem.kie_desc, record.modelDescription);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      best = record;
    }
  }

  return best;
}

function roundCost(cost: number): number {
  if (cost < 1) {
    return Math.round(cost * 100) / 100;
  }
  return Math.round(cost);
}

export function buildPricingMapping(
  mappingItems: PricingMappingItem[],
  records: KiePricingRecord[],
  options: { preserveMarkup?: boolean } = {}
): { mapping: PricingMappingItem[]; report: BuildReport } {
  const preserveMarkup = options.preserveMarkup !== false;

  const report: BuildReport = {
    updated: [],
    unchanged: [],
    notMatched: [],
  };

  const updatedMapping = mappingItems.map((item) => {
    if (!item.kie_desc || item.cost_per_unit === null || item.cost_per_unit === undefined) {
      if (!item.kie_desc) {
        report.notMatched.push(`${item.local_model} (${item.display_name}) - 无 kie_desc`);
      }
      return item;
    }

    const record = findUpstreamRecord(item, records);

    if (!record) {
      report.notMatched.push(`${item.local_model} (${item.display_name}) - ${item.kie_desc}`);
      return item;
    }

    const newUsd = parseFloat(record.usdPrice);
    const newCreditPrice = parseFloat(record.creditPrice);
    const oldUsd = item.kie_usd ?? null;
    const oldCost = item.cost_per_unit;

    let newCost: number | null = oldCost;

    if (preserveMarkup && oldUsd && oldUsd > 0 && newUsd > 0) {
      const ratio = oldCost / oldUsd;
      newCost = roundCost(newUsd * ratio);
    }

    if (oldUsd === newUsd && oldCost === newCost) {
      report.unchanged.push(`${item.local_model} (${item.display_name})`);
      return item;
    }

    report.updated.push({
      local_model: item.local_model,
      display_name: item.display_name,
      old_cost: oldCost,
      new_cost: newCost,
      old_usd: oldUsd,
      new_usd: newUsd,
    });

    return {
      ...item,
      kie_usd: newUsd,
      kie_unit: record.creditUnit,
      kie_credit_price: newCreditPrice,
      cost_per_unit: newCost,
      note: `auto-sync ${new Date().toISOString()}`,
    };
  });

  return { mapping: updatedMapping, report };
}

export function loadPricingMapping(mappingPath: string): PricingMappingItem[] {
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`找不到价格映射文件: ${mappingPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(mappingPath, 'utf-8')) as PricingMappingItem[];
  return raw;
}

export function savePricingMapping(mappingPath: string, mapping: PricingMappingItem[]): void {
  const dir = path.dirname(mappingPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n', 'utf-8');
}

export function loadSnapshot(snapshotPath: string): KiePricingRecord[] {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`找不到价格快照文件: ${snapshotPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8')) as KiePricingRecord[] | { records: KiePricingRecord[] };
  return Array.isArray(raw) ? raw : raw.records;
}

export interface BuildOptions {
  mappingPath?: string;
  snapshotPath?: string;
  outputPath?: string;
  preserveMarkup?: boolean;
}

export async function buildFromSnapshot(options: BuildOptions = {}): Promise<BuildReport> {
  const mappingPath =
    options.mappingPath ||
    getEnv('PRICING_MAPPING_PATH', path.resolve(__dirname, '../../pricing_mapping.json'));
  const snapshotPath =
    options.snapshotPath ||
    getEnv(
      'KIE_PRICING_SNAPSHOT_PATH',
      path.resolve(__dirname, '../../data/kie_pricing_snapshot.json')
    );
  const outputPath = options.outputPath || mappingPath;

  const mapping = loadPricingMapping(mappingPath);
  const records = loadSnapshot(snapshotPath);

  console.log(`[build] 加载映射 ${mapping.length} 条，上游记录 ${records.length} 条`);

  const { mapping: updatedMapping, report } = buildPricingMapping(mapping, records, {
    preserveMarkup: options.preserveMarkup,
  });

  savePricingMapping(outputPath, updatedMapping);
  console.log(`[build] 映射已保存: ${outputPath}`);

  return report;
}

function printReport(report: BuildReport) {
  console.log('\n[build] 构建完成');
  console.log(`更新: ${report.updated.length} 条`);
  report.updated.forEach((u) => {
    console.log(
      `  ✓ ${u.local_model} (${u.display_name}): ${u.old_cost} -> ${u.new_cost} (USD ${u.old_usd} -> ${u.new_usd})`
    );
  });
  console.log(`未变: ${report.unchanged.length} 条`);
  console.log(`无匹配: ${report.notMatched.length} 条`);
  report.notMatched.forEach((n) => console.log('  ✗', n));
}

async function main() {
  try {
    const report = await buildFromSnapshot();
    printReport(report);
  } catch (err) {
    console.error('[build] 构建失败:', err);
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
