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

export function getEstimatedCost(category: string, quantity = 1, duration = 1) {
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
