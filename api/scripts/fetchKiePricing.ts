/**
 * 抓取 kie.ai 上游价格快照
 *
 * 运行方式：
 *   npx tsx api/scripts/fetchKiePricing.ts
 *
 * 环境变量：
 *   KIE_PRICING_URL          上游价格接口地址（默认 https://api.kie.ai/client/v1/model-pricing/page）
 *   KIE_PRICING_PAGE_PARAM   分页参数名（默认 pageNum）
 *   KIE_PRICING_SIZE_PARAM   每页条数参数名（默认 pageSize）
 *   KIE_PRICING_PAGE_SIZE    每页条数（默认 25）
 *   KIE_PRICING_MAX_PAGES    最大分页数（默认 20）
 *   KIE_PRICING_USER_AGENT   请求 UA
 *   KIE_PRICING_HEADERS      额外请求头，格式 "Key:Value,Key:Value"
 *   KIE_PRICING_SNAPSHOT_PATH 快照保存路径（默认项目根目录 data/kie_pricing_snapshot.json）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface KiePricingRecord {
  modelDescription: string;
  interfaceType: string;
  provider: string;
  creditPrice: string;
  creditUnit: string;
  usdPrice: string;
  falPrice: string;
  discountRate: number;
  anchor: string;
  discountPrice: boolean;
}

export interface FetchOptions {
  baseUrl?: string;
  pageParam?: string;
  sizeParam?: string;
  pageSize?: number;
  maxPages?: number;
  headers?: Record<string, string>;
  snapshotPath?: string;
}

interface PageResponse {
  records: KiePricingRecord[];
  total?: number;
  pages?: number;
  current?: number;
  size?: number;
}

function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function parseResponse(json: unknown): { records: KiePricingRecord[]; meta?: PageResponse } {
  // { code, msg, data: { records: [...], total, pages } }
  if (
    json &&
    typeof json === 'object' &&
    'data' in json &&
    json.data &&
    typeof json.data === 'object' &&
    'records' in json.data &&
    Array.isArray((json.data as { records: unknown }).records)
  ) {
    const data = json.data as PageResponse;
    return { records: data.records, meta: data };
  }

  // { records: [...] }
  if (
    json &&
    typeof json === 'object' &&
    'records' in json &&
    Array.isArray((json as { records: unknown }).records)
  ) {
    const data = json as PageResponse;
    return { records: data.records, meta: data };
  }

  // 纯数组
  if (Array.isArray(json)) {
    return { records: json as KiePricingRecord[] };
  }

  throw new Error('无法识别的上游价格响应格式');
}

export async function fetchKiePricing(options: FetchOptions = {}): Promise<KiePricingRecord[]> {
  const baseUrl =
    options.baseUrl ||
    getEnv('KIE_PRICING_URL', 'https://api.kie.ai/client/v1/model-pricing/page');
  const pageParam = options.pageParam || getEnv('KIE_PRICING_PAGE_PARAM', 'pageNum');
  const sizeParam = options.sizeParam || getEnv('KIE_PRICING_SIZE_PARAM', 'pageSize');
  const pageSize = options.pageSize || parseInt(getEnv('KIE_PRICING_PAGE_SIZE', '25'), 10);
  const maxPages = options.maxPages || parseInt(getEnv('KIE_PRICING_MAX_PAGES', '20'), 10);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': getEnv(
      'KIE_PRICING_USER_AGENT',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    Origin: 'https://kie.ai',
    Referer: 'https://kie.ai/pricing',
    ...options.headers,
  };

  const rawHeaders = getEnv('KIE_PRICING_HEADERS', '');
  if (rawHeaders) {
    for (const line of rawHeaders.split(',')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) headers[k] = v;
      }
    }
  }

  const allRecords: KiePricingRecord[] = [];
  let page = 1;
  let totalPages: number | undefined;

  while (page <= maxPages) {
    if (totalPages && page > totalPages) {
      console.log(`[fetch] 已到达总页数 ${totalPages}，结束分页`);
      break;
    }

    const body: Record<string, unknown> = {
      [pageParam]: page,
      [sizeParam]: pageSize,
      modelName: '',
      category: '',
    };

    console.log(`[fetch] 请求第 ${page} 页: ${baseUrl}`);
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`上游接口返回 ${res.status}: ${text.slice(0, 500)}`);
    }

    const json = (await res.json()) as unknown;
    const { records, meta } = parseResponse(json);

    if (meta?.pages && totalPages === undefined) {
      totalPages = meta.pages;
      console.log(`[fetch] 上游共 ${meta.total} 条，${totalPages} 页`);
    }

    if (records.length === 0) {
      console.log(`[fetch] 第 ${page} 页无数据，结束分页`);
      break;
    }

    allRecords.push(...records);

    if (records.length < pageSize) {
      console.log(`[fetch] 第 ${page} 页仅 ${records.length} 条，结束分页`);
      break;
    }

    page++;
  }

  console.log(`[fetch] 共抓取 ${allRecords.length} 条上游价格记录`);

  const snapshotPath =
    options.snapshotPath ||
    getEnv(
      'KIE_PRICING_SNAPSHOT_PATH',
      path.resolve(__dirname, '../../data/kie_pricing_snapshot.json')
    );
  const snapshotDir = path.dirname(snapshotPath);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
  fs.writeFileSync(snapshotPath, JSON.stringify(allRecords, null, 2) + '\n', 'utf-8');
  console.log(`[fetch] 快照已保存: ${snapshotPath}`);

  return allRecords;
}

async function main() {
  try {
    await fetchKiePricing();
  } catch (err) {
    console.error('[fetch] 抓取失败:', err);
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
