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
  status: 'success' | 'complete' | 'pending' | 'mock';
  providerMode: 'upstream' | 'mock';
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
      apiKey: 'sk-UC4uuRrD3dvUD1xQomxJhwl0t9PMbviwhL3gvTjBTu4RFL9R',
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
      enabled: false,
      baseUrl: 'https://api.kie.ai',
      apiKey: '',
      timeoutSeconds: 180,
      costMultiplier: 1,
      models: [
        { localModel: 'grok-4-5', upstreamModel: 'grok-4-5', category: 'chat', enabled: true },
        { localModel: 'claude-sonnet-5', upstreamModel: 'claude-sonnet-5', category: 'chat', enabled: true },
        { localModel: 'seedream-4', upstreamModel: 'bytedance/seedream-v4-text-to-image', category: 'image', enabled: true },
        { localModel: 'grok-imagine', upstreamModel: 'grok-imagine/text-to-image', category: 'image', enabled: true },
        { localModel: 'flux-2', upstreamModel: 'flux-2/flex-text-to-image', category: 'image', enabled: true },
        { localModel: 'kling-2.6', upstreamModel: 'kling-2.6/text-to-video', category: 'video', enabled: true },
        { localModel: 'seedance-2', upstreamModel: 'bytedance/seedance-2-mini', category: 'video', enabled: true },
        { localModel: 'grok-video', upstreamModel: 'grok-imagine-video-1-5-preview', category: 'video', enabled: true },
        { localModel: 'happyhorse', upstreamModel: 'happyhorse-1-1', category: 'video', enabled: true },
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
  const preferred = enabledProviders.find((item) => item.name === config.activeProvider || item.id === config.activeProvider) || enabledProviders[0];
  if (!preferred) return null;

  const mapping = preferred.models.find((item) =>
    item.enabled &&
    item.category === category &&
    (item.localModel === localModel || localModel.includes(item.localModel))
  );

  return {
    provider: preferred,
    mapping: mapping || {
      localModel,
      upstreamModel: localModel,
      category,
      enabled: true,
    },
  };
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

function getMockResult(input: ProviderGenerateInput, reason = '未配置可用上游平台，使用 mock 兜底'): ProviderGenerateResult {
  const idPrefix = input.category === 'image' ? 'img' : input.category === 'video' ? 'vid' : input.category === 'audio' ? 'aud' : 'msg';
  const base = {
    id: `${idPrefix}-${Date.now()}`,
    status: 'mock' as const,
    providerMode: 'mock' as const,
    provider: 'mock',
    upstreamModel: input.localModel,
    raw: { reason },
  };

  if (input.category === 'chat') {
    return {
      ...base,
      content: `这是来自 mock 兜底的回复。当前未启用真实上游模型，后续配置 kie.ai API Key 后会自动切换到真实请求。\n\n你的输入是：${input.prompt}`,
    };
  }

  if (input.category === 'audio') {
    return {
      ...base,
      url: `audio/mock/${Date.now()}`,
    };
  }

  return {
    ...base,
    url: `https://neeko-copilot.bytedance.net/api/text2image?prompt=${encodeURIComponent(input.prompt)}&image_size=${
      input.category === 'video' ? 'landscape_16_9' : 'square'
    }`,
  };
}

/** 判断是否为 KIE provider */
function isKieProvider(provider: ProviderItem): boolean {
  return provider.id === 'kie-ai' || provider.baseUrl.includes('kie.ai');
}

/** 将 KIE 异步任务结果转换为统一的 ProviderGenerateResult */
function kieTaskToResult(taskResult: KieTaskResult, input: ProviderGenerateInput, provider: ProviderItem, upstreamModel: string): ProviderGenerateResult {
  const url = taskResult.image_url || taskResult.video_url;
  const status = taskResult.status === 'Success' ? 'success' : taskResult.status === 'Failed' ? 'mock' : 'pending';

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

  // 2. 轮询等待结果（超时 3 分钟）
  const timeoutSeconds = Math.max(10, provider.timeoutSeconds || 180);
  try {
    const result = await pollKieTask(baseUrl, provider.apiKey, taskId, {
      timeoutMs: timeoutSeconds * 1000,
      intervalMs: 3000,
    });

    return kieTaskToResult(result, input, provider, upstreamModel);
  } catch (pollError) {
    console.error(`KIE 任务 ${taskId} 轮询失败:`, pollError);
    // 轮询失败时返回 pending 状态，让前端有机会后续查询
    return {
      id: `${input.category}-${Date.now()}`,
      status: 'pending',
      providerMode: 'upstream',
      provider: provider.name,
      upstreamModel,
      raw: {
        taskId,
        pollError: pollError instanceof Error ? pollError.message : String(pollError),
      },
    };
  }
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
    const mockResult = getMockResult(input);
    mockResult.costCredits = calculateCostCredits(input.localModel, input.category, mockResult.content);
    return mockResult;
  }

  try {
    const result = await requestUpstream(input, resolved.provider, resolved.mapping.upstreamModel);
    result.costCredits = calculateCostCredits(input.localModel, input.category, result.content);
    return result;
  } catch (error) {
    console.error('Provider request fallback to mock:', error);
    const mockResult = getMockResult(input, error instanceof Error ? error.message : '上游请求失败，使用 mock 兜底');
    mockResult.costCredits = calculateCostCredits(input.localModel, input.category, mockResult.content);
    return mockResult;
  }
}

export function getProviderStatus(localModel: string, category: ProviderCategory) {
  const resolved = resolveProvider(localModel, category);
  if (!resolved) {
    return {
      mode: 'mock',
      provider: 'mock',
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
