import express, { type Request, type Response } from 'express';
import db from '../db/index.js';
import { taskResults } from './kieCallback.js';
import { queryKieTask } from '../services/kieAdapter.js';

const router = express.Router();

/** 从 admin_configs 中读取 KIE provider 的凭据 */
function getKieCredentials(): { baseUrl: string; apiKey: string } | null {
  try {
    const row = db.prepare('SELECT config_value FROM admin_configs WHERE config_key = ?').get('providers') as { config_value: string } | undefined;
    if (!row?.config_value) return null;

    const parsed = JSON.parse(row.config_value) as {
      providers: Array<{
        id: string;
        name: string;
        enabled: boolean;
        baseUrl: string;
        apiKey: string;
      }>;
    };

    const kieProvider = parsed.providers.find(
      (p) => p.id === 'kie-ai' || p.baseUrl.includes('kie.ai'),
    );

    if (!kieProvider?.baseUrl || !kieProvider?.apiKey) return null;

    return {
      baseUrl: kieProvider.baseUrl.replace(/\/+$/, ''),
      apiKey: kieProvider.apiKey,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/kie/tasks/:taskId
 * 前端查询 KIE 异步任务状态
 *
 * 优先从内存缓存中查找（回调已写入的结果），
 * 如果没有则主动向 KIE API 查询。
 *
 * 需要提供 KIE 凭据用于主动查询：
 * - querystring ?baseUrl=xxx&apiKey=xxx
 * - 或者使用系统默认配置（TODO: 未来可从 admin_configs 读取）
 */
router.get('/tasks/:taskId', async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params;
  console.log(`[kieTasks] 查询任务: ${taskId}`);

  // 1. 先查内存缓存（KIE callback 写入的结果）
  const cached = taskResults.get(taskId);
  if (cached) {
    res.status(200).json({
      success: true,
      taskId,
      source: 'cache',
      data: cached,
    });
    return;
  }

  // 2. 主动向 KIE API 查询（优先使用系统配置中的凭据，也可通过 querystring 覆盖）
  const systemCreds = getKieCredentials();
  const baseUrl = (req.query.baseUrl as string | undefined) || systemCreds?.baseUrl;
  const apiKey = (req.query.apiKey as string | undefined) || systemCreds?.apiKey;

  if (baseUrl && apiKey) {
    try {
      const result = await queryKieTask(baseUrl, apiKey, taskId);

      // 如果任务已完成，也缓存结果
      if (result.status === 'Success' || result.status === 'Failed') {
        taskResults.set(taskId, result);
      }

      res.status(200).json({
        success: true,
        taskId,
        source: 'upstream',
        data: result,
      });
      return;
    } catch (queryError) {
      res.status(502).json({
        success: false,
        error: queryError instanceof Error ? queryError.message : 'KIE 查询失败',
      });
      return;
    }
  }

  // 3. 没有缓存也没有凭据
  res.status(404).json({
    success: false,
    error: '未找到任务结果，且系统未配置 KIE 凭据',
  });
});

export default router;
