import express, { type Request, type Response } from 'express';
import { generateWithProvider } from '../services/providerService.js';
import { apiKeyOrAuthMiddleware } from '../utils/auth.js';
import { saveWork } from '../services/workService.js';

const router = express.Router();

router.post('/generate', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  const { prompt, model, resolution, duration, style, aspectRatio } = req.body;
  
  try {
    const result = await generateWithProvider({
      category: 'video',
      localModel: model || 'sora-2',
      prompt: [prompt, style].filter(Boolean).join(' '),
      params: { resolution, duration, style, aspectRatio },
    });

    if (req.user?.id) {
      saveWork({
        id: result.id,
        userId: req.user.id,
        name: String(prompt || '视频作品').slice(0, 80),
        type: 'video',
        status: result.status === 'pending' ? 'pending' : 'complete',
        inputParams: { prompt, model: model || 'sora-2', resolution, duration, style, aspectRatio },
        outputUrl: result.url,
        provider: result.provider,
        model: result.upstreamModel || model || 'sora-2',
      });
    }
    
    // 提取 KIE 异步任务 ID（如果后端轮询超时）
    const taskId = result.raw && typeof result.raw === 'object'
      ? (result.raw as Record<string, unknown>).taskId as string | undefined
      : undefined;

    res.status(200).json({
      success: true,
      id: result.id,
      url: result.url,
      status: result.status === 'pending' ? 'pending' : 'complete',
      taskId,
      providerMode: result.providerMode,
      provider: result.provider,
      upstreamModel: result.upstreamModel,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[/video/generate] 生成失败:', msg);
    res.status(500).json({
      success: false,
      error: msg,
    });
  }
});

router.post('/convert', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Image to video conversion is not yet implemented',
  });
});

export default router;
