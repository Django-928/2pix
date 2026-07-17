import express, { type Request, type Response } from 'express';
import { apiKeyOrAuthMiddleware } from '../utils/auth.js';
import { generateWithProvider } from '../services/providerService.js';
import { saveWork } from '../services/workService.js';

const router = express.Router();

/**
 * @openapi
 * /image/generate:
 *   post:
 *     tags: [内容生成]
 *     summary: 生成图片
 *     description: 调用 AI 模型生成图片，支持 API Key 或用户 Token 鉴权
 *     security: [bearerAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string, example: '一只可爱的猫咪' }
 *               model: { type: string, example: 'gpt-image-2' }
 *               style: { type: string, example: 'anime' }
 *               resolution: { type: string, example: '1024x1024' }
 *     responses:
 *       200:
 *         description: 返回生成结果（含图片 URL）
 */

router.post('/generate', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  const { prompt, model, style, resolution, steps, cfgScale, seed } = req.body;
  
  try {
    const result = await generateWithProvider({
      category: 'image',
      localModel: model || 'gpt-image-2',
      prompt: [prompt, style].filter(Boolean).join(' '),
      params: { style, resolution, steps, cfgScale, seed },
    });

    if (req.user?.id) {
      saveWork({
        id: result.id,
        userId: req.user.id,
        name: String(prompt || '图片作品').slice(0, 80),
        type: 'image',
        status: 'complete',
        inputParams: { prompt, model: model || 'gpt-image-2', style, resolution, steps, cfgScale, seed },
        outputUrl: result.url,
        provider: result.provider,
        model: result.upstreamModel || model || 'gpt-image-2',
      });
    }
    
    // 提取 KIE 异步任务 ID（如果后端轮询超时）
    const taskId = result.raw && typeof result.raw === 'object'
      ? (result.raw as Record<string, unknown>).taskId as string | undefined
      : undefined;

    console.log('[/image/generate] result:', JSON.stringify({ id: result.id, url: result.url, status: result.status, taskId, providerMode: result.providerMode }));
    res.status(200).json({
      success: true,
      id: result.id,
      url: result.url,
      status: result.status || 'pending',
      taskId,
      providerMode: result.providerMode,
      provider: result.provider,
      upstreamModel: result.upstreamModel,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[/image/generate] 生成失败:', msg);
    res.status(500).json({
        success: false,
        error: msg,
    });
}
});

router.post('/transfer', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Style transfer is not yet implemented',
  });
});

router.post('/enhance', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Image enhancement is not yet implemented',
  });
});

export default router;
