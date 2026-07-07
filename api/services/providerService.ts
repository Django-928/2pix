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
  const baseUrl = provider.baseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/v1/generate`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: upstreamModel,
        category: input.category,
        prompt: input.prompt,
        ...input.params,
      }),
      signal: controller.signal,
    });

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`上游请求失败：${response.status}`);
    }

    const url = extractUrl(raw);
    const content = extractContent(raw);

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

export async function generateWithProvider(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
  const resolved = resolveProvider(input.localModel, input.category);
  if (!resolved) {
    return getMockResult(input);
  }

  try {
    return await requestUpstream(input, resolved.provider, resolved.mapping.upstreamModel);
  } catch (error) {
    console.error('Provider request fallback to mock:', error);
    return getMockResult(input, error instanceof Error ? error.message : '上游请求失败，使用 mock 兜底');
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
