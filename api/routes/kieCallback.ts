import express, { type Request, type Response } from 'express';
import type { KieTaskResult } from '../services/kieAdapter.js';

const router = express.Router();

/** 内存存储 KIE 回调任务结果 */
export const taskResults = new Map<string, KieTaskResult>();

/**
 * POST /api/kie/callback
 * 接收 KIE 的 webhook 回调，保存任务结果到内存
 *
 * 请求体格式：
 * {
 *   "taskId": "xxx",
 *   "code": 200,
 *   "msg": "Success",
 *   "data": {
 *     "task_id": "xxx",
 *     "callbackType": "task_completed",
 *     "video_url": "...",
 *     "image_url": "..."
 *   }
 * }
 */
router.post('/callback', (req: Request, res: Response): void => {
  const body = req.body as {
    taskId?: string;
    code?: number;
    msg?: string;
    data?: {
      task_id?: string;
      callbackType?: string;
      status?: string;
      video_url?: string;
      image_url?: string;
      [key: string]: unknown;
    };
  };

  const taskId = body.taskId || body.data?.task_id;

  if (!taskId) {
    res.status(400).json({ success: false, error: '缺少 taskId' });
    return;
  }

  const data = body.data || {};
  const rawStatus = data.status || (body.code === 200 ? 'Success' : 'Failed');
  const status = (rawStatus === 'Success' || rawStatus === 'Failed' || rawStatus === 'Processing')
    ? rawStatus
    : body.code === 200 ? 'Success' : 'Failed';

  // 从 data 中提取已知字段
  const result: KieTaskResult = {
    status,
    video_url: data.video_url as string | undefined,
    image_url: data.image_url as string | undefined,
  };

  // 透传其他未知字段
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'status' && key !== 'video_url' && key !== 'image_url') {
      result[key] = value;
    }
  }

  taskResults.set(taskId, result);

  console.log(`[KIE Callback] 任务 ${taskId} 状态: ${status}`);

  res.status(200).json({ success: true, taskId });
});

export default router;
