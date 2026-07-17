import db from '../db/index.js';
import { createKieTask, pollKieTask, mapParamsToKieInput } from './kieAdapter.js';
import type { KieTaskResult } from './kieAdapter.js';

export type ProviderCategory = 'chat' | 'image' | 'video' | 'audio';

interface ProviderModel {
  localModel: string;
  upstreamModel: string;
  category: ProviderCategory | string;
  enabled: boolean;
}

interface ProviderItem {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  timeoutSeconds: number;
  costMultiplier: number;
  models: ProviderModel[];
}

interface ProviderConfig {
  activeProvider: string;
  providers: ProviderItem[];
}

interface ProviderGenerateInput {
  category: ProviderCategory;
  localModel: string;
  prompt: string;
  params?: Record<string, unknown>;
}

interface ProviderGenerateResult {
  id: string;
  status: 'success' | 'complete' | 'pending';
  providerMode: 'upstream';
  provider?: string;
  upstreamModel?: string;
  url?: string;
  content?: string;
  raw?: unknown;
  costCredits?: number;
}

const defaultProviderConfig: ProviderConfig = {
  activeProvider: 'rongchuan',
  providers: [
    {
      id: 'rongchuan',
      name: '融川 OneAPI',
      enabled: true,
      baseUrl: 'https://rongchuan.ai',
      apiKey: '',
      timeoutSeconds: 120,
      costMultiplier: 1,
      models: [
        { localModel: 'gpt-5.5', upstreamModel: 'gpt-5.5', category: 'chat', enabled: true },
        { localModel: 'gpt-5.4', upstreamModel: 'gpt-5.4', category: 'chat', enabled: true },
        { localModel: 'gpt-5.2', upstreamModel: 'gpt-5.2', category: 'chat', enabled: true },
        { localModel: 'claude-opus-4', upstreamModel: 'claude-opus-4-7', category: 'chat', enabled: true },
        { localModel: 'claude-sonnet-4', upstreamModel: 'claude-sonnet-4-6', category: 'chat', enabled: true },
        { localModel: 'gpt-image-2', upstreamModel: 'gpt-image-2', category: 'image', enabled: true },
        { localModel: 'gpt-image-1.5', upstreamModel: 'gpt-image-1.5', category: 'image', enabled: true },
        { localModel: 'gpt-image-1', upstreamModel: 'gpt-image-1', category: 'image', enabled: true },
      ],
    },
    {
      id: 'kie-ai',
      name: 'KIE AI',
      enabled: true,
      baseUrl: 'https://api.kie.ai',
      apiKey: '06053239c868c8ccda5c9a8d5e4528d9',
      timeoutSeconds: 300,
      costMultiplier: 1,
      models: [
        // KIE 专注 image/video，chat 统一走融川
        // Image 模型
        { localModel: 'gpt-image-2', upstreamModel: 'gpt-image-2', category: 'image', enabled: true },
        { localModel: 'seedream-4', upstreamModel: 'bytedance/seedream-v4-text-to-image', category: 'image', enabled: true },
        { localModel: 'flux-2', upstreamModel: 'flux-2/flex-text-to-image', category: 'image', enabled: true },
        { localModel: 'wan2-7-image', upstreamModel: 'wan-2-7-image', category: 'image', enabled: true },
        { localModel: 'qwen-image-2', upstreamModel: 'qwen-image-2', category: 'image', enabled: true },
        // Video 模型
        { localModel: 'kling-2-6', upstreamModel: 'kling-2.6/text-to-video', category: 'video', enabled: true },
        { localModel: 'seedance-2', upstreamModel: 'bytedance/seedance-2-mini', category: 'video', enabled: true },
        { localModel: 'gemini-omni', upstreamModel: 'gemini-omni', category: 'video', enabled: true },
        { localModel: 'happyhorse', upstreamModel: 'happyhorse-1-1', category: 'video', enabled: true },
        { localModel: 'wan-2-7-video', upstreamModel: 'wan-2-7-video', category: 'video', enabled: true },
      ],
    },
  ],
};

function readProviderConfig(): ProviderConfig {
  const row = db.prepare('SELECT config_value FROM admin_configs WHERE config_key = ?').get('providers') as { config_value: string } | undefined;
  if (!row?.config_value) return defaultProviderConfig;

  try {
    const parsed = JSON.parse(row.config_value) as ProviderConfig;
    if (!Array.isArray(parsed.providers)) return defaultProviderConfig;

    // 自动合并：默认配置中存在但数据库中没有的 provider，自动追加
    const existingIds = new Set(parsed.providers.map((p) => p.id));
    let merged = false;
    for (const dp of defaultProviderConfig.providers) {
      if (!existingIds.has(dp.id)) {
        parsed.providers.push(dp);
        merged = true;
      }
    }
    if (merged) {
      try {
        db.prepare("UPDATE admin_configs SET config_value = ?, updated_at = datetime('now') WHERE config_key = 'providers'")
          .run(JSON.stringify(parsed));
      } catch { /* ignore write failure */ }
    }

    return parsed;
  } catch {
    return defaultProviderConfig;
  }
}

function resolveProvider(localModel: string, category: ProviderCategory) {
  const config = readProviderConfig();
  const enabledProviders = config.providers.filter((item) => item.enabled && item.apiKey && item.baseUrl);
  if (enabledProviders.length === 0) return null;

  // 如果指定了 activeProvider，优先在该 provider 中查找
  if (config.activeProvider) {
    const preferred = enabledProviders.find(
      (item) => item.name === config.activeProvider || item.id === config.activeProvider
    );
    if (preferred) {
      const mapping = preferred.models.find(
        (item) => item.enabled && item.category === category && (item.localModel === localModel || localModel.includes(item.localModel))
      );
      if (mapping) {
        return { provider: preferred, mapping };
      }
    }
  }

  // 在所有 enabled providers 中查找第一个有该模型映射的
  for (const p of enabledProviders) {
    const mapping = p.models.find(
      (item) => item.enabled && item.category === category && (item.localModel === localModel || localModel.includes(item.localModel))
    );
    if (mapping) {
      return { provider: p, mapping };
    }
  }

  return null;
}

function extractUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const direct = data.url || data.output_url || data.image_url || data.video_url || data.audio_url;
  if (typeof direct === 'string') return direct;

  const nestedData = data.data as Record<string, unknown> | undefined;
  if (nestedData) {
    const nested = nestedData.url || nestedData.output_url || nestedData.image_url || nestedData.video_url || nestedData.audio_url;
    if (typeof nested === 'string') return nested;
    const images = nestedData.images as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(images) && typeof images[0]?.url === 'string') return images[0].url as string;
    const videos = nestedData.videos as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(videos) && typeof videos[0]?.url === 'string') return videos[0].url as string;
    const audios = nestedData.audios as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(audios) && typeof audios[0]?.url === 'string') return audios[0].url as string;
  }

  return undefined;
}

function extractContent(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const direct = data.content || data.text || data.message || data.output;
  if (typeof direct === 'string') return direct;

  const nestedData = data.data as Record<string, unknown> | undefined;
  if (nestedData) {
    const nested = nestedData.content || nestedData.text || nestedData.message || nestedData.output;
    if (typeof nested === 'string') return nested;
  }
  return undefined;
}



/** 判断是否为 KIE provider */
function isKieProvider(provider: ProviderItem): boolean {
  return provider.id === 'kie-ai' || provider.baseUrl.includes('kie.ai');
}

/** 将 KIE 异步任务结果转换为统一的 ProviderGenerateResult */
function kieTaskToResult(taskResult: KieTaskResult, input: ProviderGenerateInput, provider: ProviderItem, upstreamModel: string): ProviderGenerateResult {
  const url = taskResult.image_url || taskResult.video_url;
  const status = taskResult.status === 'Success' ? 'success' : taskResult.status === 'Failed' ? 'complete' : 'pending';

  return {
    id: `${input.category}-${Date.now()}`,
    status,
    providerMode: 'upstream',
    provider: provider.name,
    upstreamModel,
    url,
    raw: taskResult,
  };
}

/** 通过 KIE 异步任务流程请求上游（image/video） */
async function requestKieAsyncTask(input: ProviderGenerateInput, provider: ProviderItem, upstreamModel: string): Promise<ProviderGenerateResult> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');
  const imageUrls = input.params?.imageUrls as string[] | undefined;
  const kieInput = mapParamsToKieInput(upstreamModel, input.params, input.prompt, imageUrls);

  // 1. 创建异步任务
  const { taskId } = await createKieTask(baseUrl, provider.apiKey, upstreamModel, kieInput);

  // 2. 快速返回 taskId 让前端轮询（后端不再长时间阻塞等待）
  // 后端只轮询 15 秒，如果还没完成就返回 pending + taskId
  try {
    const result = await pollKieTask(baseUrl, provider.apiKey, taskId, {
      timeoutMs: 15_000,
      intervalMs: 3000,
    });

    return kieTaskToResult(result, input, provider, upstreamModel);
  } catch (pollError) {
    console.log(`KIE 任务 ${taskId} 未在初始轮询中完成，交由前端继续轮询`);
  }

  // 3. 返回 pending 状态 + taskId，让前端后续查询
  return {
    id: `${input.category}-${Date.now()}`,
    status: 'pending',
    providerMode: 'upstream',
    provider: provider.name,
    upstreamModel,
    raw: {
      taskId,
    },
  };
}

async function requestUpstream(input: ProviderGenerateInput, provider: ProviderItem, upstreamModel: string): Promise<ProviderGenerateResult> {
  // KIE 的 image/video 使用异步任务流程
  if (isKieProvider(provider) && (input.category === 'image' || input.category === 'video')) {
    return requestKieAsyncTask(input, provider, upstreamModel);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(10, provider.timeoutSeconds || 120) * 1000);
  // baseUrl 可能已包含路径（如 https://rongchuan.ai/v1/），需要智能拼接 endpoint
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');
  const hasV1 = baseUrl.endsWith('/v1');
  const base = hasV1 ? baseUrl : `${baseUrl}/v1`;

  try {
    let endpoint: string;
    let body: Record<string, unknown>;

    if (input.category === 'chat') {
      // 聊天类使用 OpenAI 兼容的 /chat/completions 标准接口
      endpoint = `${base}/chat/completions`;
      const messages = (input.params?.messages as Array<{ role: string; content: string }> | undefined) || [
        { role: 'user', content: input.prompt },
      ];
      body = {
        model: upstreamModel,
        messages,
        stream: true,
      };
    } else {
      // 图片/视频/音频生成类使用 /images/generations 或通用 /generate
      endpoint = input.category === 'image'
        ? `${base}/images/generations`
        : `${base}/generate`;
      body = {
        model: upstreamModel,
        prompt: input.prompt,
        ...input.params,
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errMsg = errBody?.error ? JSON.stringify(errBody.error) : errMsg;
      } catch { /* ignore parse error */ }
      throw new Error(`上游请求失败：${errMsg}`);
    }

    let raw: unknown;
    let content: string | undefined;
    const url = input.category !== 'chat' ? extractUrl(undefined) : undefined;

    if (input.category === 'chat' && response.headers.get('content-type')?.includes('text/event-stream')) {
      // SSE 流式响应：读取所有 chunk 拼接完整内容
      const text = await response.text();
      let fullContent = '';
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') fullContent += delta;
        } catch { /* skip malformed chunks */ }
      }
      content = fullContent;
      raw = { stream: true, content: fullContent, model: upstreamModel };
    } else {
      raw = await response.json().catch(() => ({}));
      const openaiContent = extractOpenAIChatContent(raw);
      const rawUrl = extractUrl(raw);
      content = openaiContent || extractContent(raw);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      void url;
      return {
        id: `${input.category}-${Date.now()}`,
        status: input.category === 'video' ? 'pending' : 'success',
        providerMode: 'upstream',
        provider: provider.name,
        upstreamModel,
        url: rawUrl,
        content,
        raw,
      };
    }

    return {
      id: `${input.category}-${Date.now()}`,
      status: 'success',
      providerMode: 'upstream',
      provider: provider.name,
      upstreamModel,
      url,
      content,
      raw,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** 从 OpenAI chat/completions 响应格式中提取 content */
function extractOpenAIChatContent(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message as Record<string, unknown> | undefined;
    if (message && typeof message.content === 'string') return message.content;
  }
  // 也检查嵌套在 data 中的情况
  const nestedData = data.data as Record<string, unknown> | undefined;
  if (nestedData) {
    const nestedChoices = nestedData.choices as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(nestedChoices) && nestedChoices.length > 0) {
      const nestedMsg = nestedChoices[0].message as Record<string, unknown> | undefined;
      if (nestedMsg && typeof nestedMsg.content === 'string') return nestedMsg.content;
    }
  }
  return undefined;
}

/** 计算本次调用的积分消耗 */
function calculateCostCredits(
  localModel: string,
  category: ProviderCategory,
  content?: string,
): number {
  const pricing = db.prepare('SELECT * FROM model_pricing WHERE local_model = ? AND enabled = 1').get(localModel) as {
    cost_per_unit: number;
    unit_type: string;
  } | undefined;

  if (!pricing) {
    // 找不到定价时使用默认值
    if (category === 'image') return 10;
    if (category === 'video') return 40;
    if (category === 'audio') return 5;
    return 1;
  }

  if (pricing.unit_type === 'per_1k_tokens') {
    // chat 类型：根据返回内容粗略估算 token 数（中文约 1.5 字符/token，英文约 4 字符/token）
    if (!content) return pricing.cost_per_unit;
    const estimatedTokens = Math.max(1, Math.ceil(content.length / 2));
    const units = Math.max(1, Math.ceil(estimatedTokens / 1000));
    return units * pricing.cost_per_unit;
  }

  // per_call / per_minute 直接返回单价
  return pricing.cost_per_unit;
}

export async function generateWithProvider(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
  const resolved = resolveProvider(input.localModel, input.category);
  if (!resolved) {
    throw new Error(`未找到可用的 provider 来处理 ${input.category} 模型 "${input.localModel}"，请检查后台 provider 配置`);
  }

  const result = await requestUpstream(input, resolved.provider, resolved.mapping.upstreamModel);
  result.costCredits = calculateCostCredits(input.localModel, input.category, result.content);
  return result;
}

export function getProviderStatus(localModel: string, category: ProviderCategory) {
  const resolved = resolveProvider(localModel, category);
  if (!resolved) {
    return {
      mode: 'unavailable' as const,
      provider: '',
      upstreamModel: localModel,
      enabled: false,
    };
  }

  return {
    mode: 'upstream',
    provider: resolved.provider.name,
    upstreamModel: resolved.mapping.upstreamModel,
    enabled: true,
  };
}
