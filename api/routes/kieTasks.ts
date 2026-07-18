import express, { type Request, type Response } from 'express';
import { taskResults } from './kieCallback.js';
import { queryKieTask, normalizeKieResult } from '../services/kieAdapter.js';
import { readProviderConfig } from '../services/providerService.js';

const router = express.Router();

/**
 * GET /api/kie/tasks/:taskId
 * 前端查询 KIE 异步任务状态
 */
router.get('/tasks/:taskId', async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  console.log(`[kieTasks] 查询任务: ${taskId}`);

  // 1. 先查内存缓存（KIE callback 写入的结果）
  const cached = taskResults.get(taskId);
  if (cached) {
    console.log(`[kieTasks] 命中缓存`);
    res.status(200).json({
      success: true,
      taskId,
      source: 'cache',
      data: cached,
    });
    return;
  }

  // 2. 从 provider 配置中获取 KIE 凭据
  const config = readProviderConfig();
  const kieProvider = config.providers.find(
    (p) => p.id === 'kie-ai' || p.baseUrl?.includes('kie.ai'),
  );

  if (!kieProvider?.baseUrl || !kieProvider?.apiKey) {
    console.log(`[kieTasks] 未找到KIE provider配置, providers count: ${config.providers.length}`);
    // 列出所有provider ID方便调试
    console.log(`[kieTasks] provider IDs: ${config.providers.map(p => p.id).join(', ')}`);
    res.status(404).json({
      success: false,
      error: '未找到KIE provider配置',
    });
    return;
  }

  const baseUrl = kieProvider.baseUrl.replace(/\/+$/, '');
  const apiKey = kieProvider.apiKey;

  try {
    console.log(`[kieTasks] 向KIE查询: ${baseUrl}/... taskId=${taskId}`);
    const result = await queryKieTask(baseUrl, apiKey, taskId);
    console.log(`[kieTasks] KIE返回: state=${result.state || result.status}, resultUrl=${result.resultUrl ? 'yes' : 'no'}`);

    // 如果任务已完成，也缓存结果
    const normalized = normalizeKieResult(result);
    if (normalized.status === 'success' || normalized.status === 'failed') {
      taskResults.set(taskId, result);
    }

    res.status(200).json({
      success: true,
      taskId,
      source: 'upstream',
      data: result,
    });
  } catch (queryError) {
    console.error(`[kieTasks] KIE查询失败:`, queryError);
    res.status(502).json({
      success: false,
      error: queryError instanceof Error ? queryError.message : 'KIE 查询失败',
    });
  }
});

export default router;