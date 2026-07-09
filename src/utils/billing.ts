import api from '@/utils/api';

interface BillingTaskOptions<T> {
  model: string;
  category: 'chat' | 'image' | 'video' | 'audio' | string;
  estimatedCost: number;
  description: string;
  taskId?: string;
  run: (taskId: string) => Promise<T>;
  onBalanceChange?: () => Promise<void> | void;
}

export async function runBillableTask<T>({
  model,
  category,
  estimatedCost,
  description,
  taskId = `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  run,
  onBalanceChange,
}: BillingTaskOptions<T>): Promise<T> {
  await api.post('/billing/precharge', {
    model,
    category,
    estimatedCost,
    taskId,
    description,
  });
  await onBalanceChange?.();

  try {
    const result = await run(taskId);
    await api.post('/billing/confirm', { taskId });
    await onBalanceChange?.();
    return result;
  } catch (error) {
    await api.post('/billing/refund', {
      taskId,
      reason: `${description}失败，自动退还额度`,
    });
    await onBalanceChange?.();
    throw error;
  }
}

/**
 * 调用后端定价 API 获取准确的预估消耗积分
 */
export async function fetchEstimatedCost(
  model: string,
  category: string,
  inputTokens?: number,
): Promise<number> {
  try {
    const params = new URLSearchParams({ model, category });
    if (inputTokens !== undefined) {
      params.set('input_tokens', String(inputTokens));
    }
    const data = await api.get<{ estimated_cost: number }>(
      `/pricing/estimate?${params.toString()}`,
    );
    return data.estimated_cost;
  } catch {
    // 接口不可用时回退到本地估算
    return getEstimatedCost(category);
  }
}

/**
 * 本地估算消耗积分（fallback，当定价 API 不可用时使用）
 */
export function getEstimatedCost(
  category: string,
  quantity = 1,
  duration = 1,
): number {
  switch (category) {
    case 'chat':
      return Math.max(1, quantity);
    case 'image':
      return Math.max(1, quantity) * 12;
    case 'video':
      return Math.max(1, duration) * 8;
    case 'audio':
      return Math.max(1, quantity) * 6;
    default:
      return Math.max(1, quantity);
  }
}
