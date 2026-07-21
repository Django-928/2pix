import express, { type Request, type Response } from 'express';
import { generateWithProvider } from '../services/providerService.js';
import { apiKeyOrAuthMiddleware } from '../utils/auth.js';
import { saveWork } from '../services/workService.js';

const router = express.Router();

router.post('/speech', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  const { text, voice, language, model } = req.body;
  
  try {
    const result = await generateWithProvider({
      category: 'audio',
      localModel: model || 'elevenlabs-tts',
      prompt: text,
      params: { voice, language, mode: 'speech' },
    });

    if (req.user?.id) {
      saveWork({
        id: result.id,
        userId: req.user.id,
        name: String(text || '语音作品').slice(0, 80),
        type: 'audio',
        status: 'complete',
        inputParams: { prompt: text, model: model || 'elevenlabs-tts', voice, language, mode: 'speech' },
        outputUrl: result.url,
        provider: result.provider,
        model: result.upstreamModel || model || 'elevenlabs-tts',
      });
    }
    
    res.status(200).json({
      success: true,
      id: result.id,
      url: result.url,
      providerMode: result.providerMode,
      provider: result.provider,
      upstreamModel: result.upstreamModel,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[/audio/speech] 生成失败:', msg);
    res.status(500).json({
      success: false,
      error: 'Failed to generate speech',
      detail: msg,
    });
  }
});

router.post('/music', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  const { genre, mood, duration, prompt, model } = req.body;
  
  try {
    const result = await generateWithProvider({
      category: 'audio',
      localModel: model || 'suno-api',
      prompt: prompt || `${genre || ''} ${mood || ''}`.trim(),
      params: { genre, mood, duration, mode: 'music' },
    });

    if (req.user?.id) {
      saveWork({
        id: result.id,
        userId: req.user.id,
        name: String(prompt || `${genre || ''} ${mood || ''}`.trim() || '音乐作品').slice(0, 80),
        type: 'audio',
        status: 'complete',
        inputParams: { prompt: prompt || `${genre || ''} ${mood || ''}`.trim(), genre, mood, duration, model: model || 'suno-api', mode: 'music' },
        outputUrl: result.url,
        provider: result.provider,
        model: result.upstreamModel || model || 'suno-api',
      });
    }
    
    res.status(200).json({
      success: true,
      id: result.id,
      url: result.url,
      providerMode: result.providerMode,
      provider: result.provider,
      upstreamModel: result.upstreamModel,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[/audio/music] 生成失败:', msg);
    res.status(500).json({
      success: false,
      error: 'Failed to generate music',
      detail: msg,
    });
  }
});

router.post('/effects', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  void req
  
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    res.status(200).json({
      success: true,
      id: `aud-${Date.now()}`,
      url: `audio/effects/${Date.now()}`,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to generate effects',
    });
  }
});

export default router;
