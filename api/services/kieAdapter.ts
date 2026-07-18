// KIE 异步任务适配器
// 处理 KIE 的 createTask + queryTask 异步流程

export interface KieCreateTaskResult {
  taskId: string;
}

export interface KieTaskResult {
  /** KIE 使用 state 字段（generating/completed/failed），部分模型使用 status（Success/Processing/Failed） */
  state?: string;
  status?: string;
  /** KIE 使用 resultUrl 字段 */
  resultUrl?: string;
  /** 兼容旧字段名 */
  video_url?: string;
  image_url?: string;
  [key: string]: unknown;
}

/**
 * 从 KieTaskResult 中提取标准化的状态和 URL
 */
export function normalizeKieResult(task: KieTaskResult): { status: 'success' | 'failed' | 'pending'; url?: string } {
  // 状态归一化：state 或 status 字段
  const rawStatus = task.state || task.status || '';
  const statusLower = rawStatus.toLowerCase();

  let status: 'success' | 'failed' | 'pending';
  if (statusLower === 'success' || statusLower === 'completed' || statusLower === 'succeeded') {
    status = 'success';
  } else if (statusLower === 'failed' || statusLower === 'failure') {
    status = 'failed';
  } else {
    status = 'pending';
  }

  // URL 归一化：resultUrl 或 image_url 或 video_url
  const url = task.resultUrl || task.image_url || task.video_url;

  return { status, url };
}

interface KieApiResponse<T = unknown> {
  code: number;
  msg?: string;
  data: T;
}

/** 创建 KIE 异步任务 */
export async function createKieTask(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: Record<string, unknown>,
): Promise<KieCreateTaskResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/jobs/createTask`;

  const body: Record<string, unknown> = {
    model,
    input,
    callbackUrl: `${process.env.PUBLIC_URL || 'https://www.2pix.cn'}/api/kie/callback`,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.json().catch(() => ({})) as KieApiResponse<{ taskId: string }>;

  if (!response.ok || raw.code !== 200) {
    throw new Error(`KIE createTask 失败：${raw.msg || `HTTP ${response.status}`}`);
  }

  const taskId = raw.data?.taskId;
  if (!taskId || typeof taskId !== 'string') {
    throw new Error(`KIE createTask 返回无效 taskId：${JSON.stringify(raw)}`);
  }

  return { taskId };
}

/** 查询 KIE 任务状态（供轮询使用） */
export async function queryKieTask(
  baseUrl: string,
  apiKey: string,
  taskId: string,
): Promise<KieTaskResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const raw = await response.json().catch(() => ({})) as KieApiResponse<KieTaskResult>;

  if (!response.ok || raw.code !== 200) {
    throw new Error(`KIE queryTask 失败：${raw.msg || `HTTP ${response.status}`}`);
  }

  return raw.data;
}

/** 轮询等待 KIE 任务完成（带超时） */
export async function pollKieTask(
  baseUrl: string,
  apiKey: string,
  taskId: string,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    onProgress?: (status: string, elapsed: number) => void;
  },
): Promise<KieTaskResult> {
  const timeoutMs = options?.timeoutMs ?? 3 * 60 * 1000; // 默认 3 分钟
  const intervalMs = options?.intervalMs ?? 3000; // 默认 3 秒
  const onProgress = options?.onProgress;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await queryKieTask(baseUrl, apiKey, taskId);
    const elapsed = Date.now() - startTime;
    const normalized = normalizeKieResult(result);

    if (onProgress) {
      onProgress(normalized.status, elapsed);
    }

    if (normalized.status === 'success') {
      return result;
    }

    if (normalized.status === 'failed') {
      throw new Error(`KIE 任务 ${taskId} 执行失败：${JSON.stringify(result)}`);
    }

    // status === 'Processing'，继续等待
    await sleep(intervalMs);
  }

  throw new Error(`KIE 任务 ${taskId} 超时（${timeoutMs / 1000}秒）`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========== 参数映射 ==========

/** 分辨率字符串映射到 KIE image_size 字段 */
const RESOLUTION_TO_IMAGE_SIZE: Record<string, string> = {
  '1024x1024': 'square_hd',
  '1792x1024': 'landscape_16_9',
  '1024x1792': 'portrait_16_9',
  '1152x896': 'landscape_4_3',
  '896x1152': 'portrait_4_3',
  '1344x768': 'landscape_16_9',
  '768x1344': 'portrait_16_9',
  '1536x1024': 'landscape_3_2',
  '1024x1536': 'portrait_3_2',
  '1280x720': 'landscape_16_9',
  '720x1280': 'portrait_16_9',
  '1920x1080': 'landscape_16_9',
  '1080x1920': 'portrait_16_9',
};

/** style 值映射到 guidance_scale */
const STYLE_TO_GUIDANCE_SCALE: Record<string, number> = {
  high: 3.5,
  medium: 2.5,
  low: 1.5,
};

/**
 * 将前端传来的通用参数映射为 KIE API 的 input 格式
 *
 * @param upstreamModel - KIE 上游模型标识（如 "bytedance/seedream-v4-text-to-image"）
 * @param params - 前端传入的额外参数（style, resolution, seed, aspectRatio, duration 等）
 * @param prompt - 用户提示词
 * @param imageUrls - 图生视频时传入的参考图片 URL 列表
 */
export function mapParamsToKieInput(
  upstreamModel: string,
  params: Record<string, unknown> | undefined,
  prompt: string,
  imageUrls?: string[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt,
  };

  if (!params) return input;

  const isImageModel = (upstreamModel.includes('image') || upstreamModel.includes('seedream') || upstreamModel.includes('flux') || upstreamModel.includes('grok-imagine')) && !upstreamModel.includes('video');
  const isVideoModel = upstreamModel.includes('video') || upstreamModel.includes('seedance') || upstreamModel.includes('kling');

  // seed
  if (params.seed !== undefined && params.seed !== null && params.seed !== '') {
    input.seed = Number(params.seed);
  }

  // style → guidance_scale（仅 image）
  if (isImageModel && params.style !== undefined && params.style !== null) {
    const styleStr = String(params.style).toLowerCase();
    if (STYLE_TO_GUIDANCE_SCALE[styleStr]) {
      input.guidance_scale = STYLE_TO_GUIDANCE_SCALE[styleStr];
    }
  }

  // resolution → image_size（仅 image）
  if (isImageModel && params.resolution !== undefined && params.resolution !== null) {
    const resStr = String(params.resolution);
    const mapped = RESOLUTION_TO_IMAGE_SIZE[resStr];
    if (mapped) {
      input.image_size = mapped;
    } else {
      input.image_size = resStr;
    }
  }

  // aspectRatio（image 和 video 都支持）
  if (params.aspectRatio !== undefined && params.aspectRatio !== null && params.aspectRatio !== '') {
    input.aspect_ratio = String(params.aspectRatio);
  }

  // duration（仅 video）
  if (isVideoModel && params.duration !== undefined && params.duration !== null) {
    input.duration = String(params.duration);
  }

  // resolution → resolution（仅 video，如 "720p", "1080p"）
  if (isVideoModel && params.resolution !== undefined && params.resolution !== null) {
    input.resolution = String(params.resolution);
  }

  // imageUrls → image_urls（图生视频）
  if (isVideoModel && imageUrls && imageUrls.length > 0) {
    input.image_urls = imageUrls;
  }

  // 其他未识别参数直接透传
  const reservedKeys = new Set(['seed', 'style', 'resolution', 'aspectRatio', 'duration', 'imageUrls', 'messages', 'steps', 'cfgScale', 'count', 'referenceImages', 'advanced']);
  for (const [key, value] of Object.entries(params)) {
    if (!reservedKeys.has(key) && input[key] === undefined) {
      input[key] = value;
    }
  }

  return input;
}
