import db from '../db/index.js';

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
  activeProvider: 'kie.ai',
  providers: [
    {
      id: 'kie-ai',
      name: 'kie.ai',
      enabled: false,
      baseUrl: 'https://api.kie.ai',
      apiKey: '',
      timeoutSeconds: 120,
      costMultiplier: 1,
      models: [
        { localModel: 'gpt-image-2', upstreamModel: 'kie-image', category: 'image', enabled: true },
        { localModel: 'sora-2', upstreamModel: 'kie-video', category: 'video', enabled: true },
        { localModel: 'suno-v4-5', upstreamModel: 'kie-music', category: 'audio', enabled: true },
        { localModel: 'gpt-5.5', upstreamModel: 'kie-chat', category: 'chat', enabled: true },
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

async function requestUpstream(input: ProviderGenerateInput, provider: ProviderItem, upstreamModel: string): Promise<ProviderGenerateResult> {
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
        stream: false,
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

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = (raw as Record<string, unknown>)?.error
        ? JSON.stringify((raw as Record<string, unknown>).error)
        : `HTTP ${response.status}`;
      throw new Error(`上游请求失败：${errMsg}`);
    }

    // OpenAI chat/completions 格式: { choices: [{ message: { content } }] }
    const openaiContent = extractOpenAIChatContent(raw);
    const url = extractUrl(raw);
    const content = openaiContent || extractContent(raw);

    return {
      id: `${input.category}-${Date.now()}`,
      status: input.category === 'video' ? 'pending' : 'success',
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
