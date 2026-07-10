/**
 * KIE 异步任务轮询工具
 *
 * 当后端轮询超时后，前端可使用此工具继续轮询 KIE 任务状态，
 * 直到获取到最终结果（image_url / video_url）或超时。
 */

export interface KieTaskPollingOptions {
  /** 最大轮询次数，默认 60（即 3 分钟 @ 3s 间隔） */
  maxAttempts?: number;
  /** 轮询间隔(ms)，默认 3000 */
  intervalMs?: number;
  /** 进度回调，percent 为 0~100 */
  onProgress?: (percent: number) => void;
  /** 取消信号 */
  signal?: AbortSignal;
}

export interface KieTaskPollingResult {
  url?: string;
  status: string;
  /** KIE 返回的原始数据 */
  raw?: Record<string, unknown>;
}

const API_BASE = '/api';

function sleep(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    if (signal?.aborted) {
      clearTimeout(timer);
      resolve(true);
      return;
    }
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        resolve(true);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * 轮询 KIE 任务，直到拿到结果或超时。
 *
 * @param taskId  KIE 任务 ID（后端响应中的 taskId 字段）
 * @param options 可选配置
 * @returns 任务结果；超时/失败时 status 为 'Timeout' / 'Failed'，url 为 undefined
 */
export async function pollKieTask(
  taskId: string,
  options?: KieTaskPollingOptions,
): Promise<KieTaskPollingResult | null> {
  const {
    maxAttempts = 60,
    intervalMs = 3000,
    onProgress,
    signal,
  } = options || {};

  for (let i = 0; i < maxAttempts; i++) {
    // 检查取消信号
    if (signal?.aborted) {
      return { status: 'Cancelled' };
    }

    // 上报进度：线性从 0% 到 95%（最后一次留给 100%）
    if (onProgress) {
      onProgress(Math.min(Math.round(((i + 1) / maxAttempts) * 95), 95));
    }

    // 等待间隔（首次不等待，立即查询）
    if (i > 0) {
      const cancelled = await sleep(intervalMs, signal);
      if (cancelled) {
        return { status: 'Cancelled' };
      }
    }

    // 检查取消信号
    if (signal?.aborted) {
      return { status: 'Cancelled' };
    }

    try {
      const res = await fetch(`${API_BASE}/kie/tasks/${taskId}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        // 服务端错误，继续轮询
        continue;
      }

      const data = await res.json();

      // 后端封装的格式：{ success, data: { status, image_url, video_url, ... } }
      const task = data?.data ?? data;

      if (task.status === 'Success') {
        const url =
          task.image_url ||
          task.video_url ||
          (task as Record<string, unknown>).url;
        if (typeof url === 'string') {
          if (onProgress) onProgress(100);
          return { url, status: 'Success', raw: task as Record<string, unknown> };
        }
      }

      if (task.status === 'Failed') {
        return { status: 'Failed', raw: task as Record<string, unknown> };
      }

      // 其他状态（Pending / Processing），继续轮询
    } catch {
      // 网络错误，继续轮询
    }
  }

  return { status: 'Timeout' };
}
