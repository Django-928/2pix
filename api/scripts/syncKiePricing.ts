/**
 * 自动同步 kie.ai 上游价格到本地 model_pricing 表
 *
 * 运行方式：
 *   npx tsx api/scripts/syncKiePricing.ts
 *
 * 数据源：
 *   默认读取项目根目录的 pricing_mapping.json（由 kie.ai/pricing 抓取并人工校验后的映射）。
 *   可通过 PRICING_MAPPING_PATH 环境变量指定其他文件。
 *
 * 该脚本会跳过 cost_per_unit 为 null（无上游对应）的模型，仅更新有明确上游价格的模型。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PricingMappingItem {
  local_model: string;
  category: string;
  display_name: string;
  cost_per_unit: number | null;
  unit_type?: string;
  unit_label?: string;
  kie_desc?: string;
  kie_usd?: number;
  kie_unit?: string;
  note?: string;
}

/**
 * DB 中的模型 ID 与 pricing_mapping.json 中模型 ID 的显式映射。
 * 当 DB 使用简写、JSON 使用详细版本时使用。
 */
const DB_TO_JSON_MAP: Record<string, string> = {
  'claude-opus': 'claude-opus',
  'claude-sonnet': 'claude-sonnet',
  'wan-2.1': 'wan2-7-image',
  'seedream-5': 'seedream-5',
  'nano-banana': 'nano-banana',
  'jimeng-3': 'jimeng-3',
  'kling-3': 'kling-3',
  'grok-video': 'grok-video',
  'runway-gen3': 'runway-gen3',
  seedance: 'seedance',
  'hailuo-video': 'hailuo-video',
  'veo-3.1': 'veo-3.1',
  'gpt-5.5': 'gpt-5.5',
  'gpt-image-2': 'gpt-image-2',
  'gemini-3-pro': 'gemini-3-pro',
  'gemini-flash': 'gemini-flash',
};

function loadPricingMapping(): PricingMappingItem[] {
  const mappingPath =
    process.env.PRICING_MAPPING_PATH ||
    path.resolve(__dirname, '../../pricing_mapping.json');

  if (!fs.existsSync(mappingPath)) {
    throw new Error(`找不到价格映射文件: ${mappingPath}`);
  }

  console.log(`[sync] 加载价格映射: ${mappingPath}`);
  const raw = JSON.parse(fs.readFileSync(mappingPath, 'utf-8')) as PricingMappingItem[];
  return raw;
}

export function syncPricing(): {
  updated: string[];
  skipped: string[];
  notMatched: string[];
} {
  console.log('[sync] 开始同步 kie.ai 上游价格...');

  const mappingList = loadPricingMapping();
  const jsonPrices = new Map(
    mappingList
      .filter((item) => item.cost_per_unit !== null && item.cost_per_unit !== undefined)
      .map((item) => [item.local_model, item])
  );

  const currentPricing = db
    .prepare('SELECT local_model, cost_per_unit, display_name, category FROM model_pricing WHERE enabled = 1')
    .all() as Array<{
    local_model: string;
    cost_per_unit: number;
    display_name: string;
    category: string;
  }>;

  const updateStmt = db.prepare(
    `UPDATE model_pricing
     SET cost_per_unit = ?, updated_at = datetime('now')
     WHERE local_model = ?`
  );

  const updated: string[] = [];
  const skipped: string[] = [];
  const notMatched: string[] = [];

  for (const dbModel of currentPricing) {
    const jsonKey = DB_TO_JSON_MAP[dbModel.local_model] || dbModel.local_model;
    const priceInfo = jsonPrices.get(jsonKey);

    if (!priceInfo) {
      notMatched.push(`${dbModel.local_model} (${dbModel.display_name})`);
      continue;
    }

    const newCost = priceInfo.cost_per_unit!;
    if (newCost === dbModel.cost_per_unit) {
      skipped.push(`${dbModel.local_model} (${dbModel.display_name}) - 价格未变 ${newCost}`);
      continue;
    }

    updateStmt.run(newCost, dbModel.local_model);

    updated.push(
      `${dbModel.local_model} (${dbModel.display_name}): ${dbModel.cost_per_unit} -> ${newCost}`
    );
  }

  console.log('\n[sync] 同步完成');
  console.log(`更新: ${updated.length} 条`);
  updated.forEach((u) => console.log('  ✓', u));
  console.log(`跳过: ${skipped.length} 条`);
  skipped.forEach((s) => console.log('  -', s));
  console.log(`无上游匹配: ${notMatched.length} 条`);
  notMatched.forEach((n) => console.log('  ✗', n));

  return { updated, skipped, notMatched };
}

async function main() {
  try {
    syncPricing();
  } catch (err) {
    console.error('[sync] 同步失败:', err);
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
