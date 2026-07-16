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
 * 同步本地估算（仅用于 UI 展示提示，不参与实际扣费）
 */
export function getEstimatedCostSync(
  category: string,
  quantity = 1,
  duration = 1,
): number {
  switch (category) {
    case 'chat':   return Math.max(1, quantity) * 5;
    case 'image':  return Math.max(1, quantity) * 10;
    case 'video':  return Math.max(1, duration) * 20;
    case 'audio':  return Math.max(1, quantity) * 6;
    default:      return Math.max(1, quantity);
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
    return getEstimatedCostSync(category);
  }
}

/**
 * 本地估算消耗积分（优先调后端 API，不可用时 fallback）
 */
export async function getEstimatedCost(
  category: string,
  quantity = 1,
  duration = 1,
  model?: string,
): Promise<number> {
  try {
    const params = new URLSearchParams({
      category,
      quantity: String(quantity),
      duration: String(duration),
      model: model || 'default',
    });
    const result = await api.get<{ credits: number }>(`/pricing/estimate?${params.toString()}`);
    return Math.max(1, Math.ceil(result.credits || 0));
  } catch {
    // fallback
    return getEstimatedCostSync(category, quantity, duration);
  }
}
