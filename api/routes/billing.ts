import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { apiKeyOrAuthMiddleware } from '../utils/auth.js';

const router = Router();

router.use(apiKeyOrAuthMiddleware);

router.post('/precharge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { model, category, estimatedCost, taskId, description } = req.body;
    const cost = Number(estimatedCost);

    if (!model || !category || !taskId || !cost || cost <= 0) {
      res.status(400).json({ success: false, error: '模型、分类、任务ID和预估费用不能为空' });
      return;
    }

    const user = db.prepare('SELECT id, balance, status FROM users WHERE id = ?').get(req.user?.id) as { id: number; balance: number; status: string } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }
    if (user.status !== 'active') {
      res.status(403).json({ success: false, error: '账户已被禁用' });
      return;
    }
    if (user.balance < cost) {
      res.status(402).json({ success: false, error: '余额不足，请先充值', code: 'INSUFFICIENT_BALANCE' });
      return;
    }

    const balanceAfter = user.balance - cost;

    db.prepare('BEGIN').run();
    try {
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceAfter, user.id);
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
        VALUES (?, 'consume', ?, ?, ?, ?, ?)
      `).run(user.id, -cost, user.balance, balanceAfter, description || `${model} 生成任务预扣`, taskId);
      db.prepare(`
        INSERT INTO token_usage (user_id, model, category, cost, task_id, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(user.id, model, category, cost, taskId);
      db.prepare('COMMIT').run();
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }

    res.json({
      success: true,
      data: {
        taskId,
        cost,
        balance_before: user.balance,
        balance_after: balanceAfter,
      },
    });
  } catch (error) {
    console.error('Precharge error:', error);
    res.status(500).json({ success: false, error: '预扣额度失败' });
  }
});

router.post('/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      res.status(400).json({ success: false, error: '任务ID不能为空' });
      return;
    }

    const usage = db.prepare('SELECT * FROM token_usage WHERE task_id = ? AND user_id = ?').get(taskId, req.user?.id) as { id: number; status: string } | undefined;
    if (!usage) {
      res.status(404).json({ success: false, error: '任务扣费记录不存在' });
      return;
    }
    if (usage.status === 'refunded') {
      res.status(400).json({ success: false, error: '任务已退款，不能确认扣费' });
      return;
    }

    db.prepare('UPDATE token_usage SET status = ? WHERE id = ?').run('completed', usage.id);
    res.json({ success: true, message: '扣费已确认' });
  } catch (error) {
    console.error('Confirm billing error:', error);
    res.status(500).json({ success: false, error: '确认扣费失败' });
  }
});

router.post('/refund', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId, reason } = req.body;
    if (!taskId) {
      res.status(400).json({ success: false, error: '任务ID不能为空' });
      return;
    }

    const usage = db.prepare('SELECT * FROM token_usage WHERE task_id = ? AND user_id = ?').get(taskId, req.user?.id) as { id: number; user_id: number; cost: number; status: string; model: string } | undefined;
    if (!usage) {
      res.status(404).json({ success: false, error: '任务扣费记录不存在' });
      return;
    }
    if (usage.status === 'refunded') {
      res.status(400).json({ success: false, error: '该任务已退款，不能重复退款', code: 'REFUND_ALREADY_DONE' });
      return;
    }

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(usage.user_id) as { balance: number };
    const balanceAfter = user.balance + usage.cost;

    db.prepare('BEGIN').run();
    try {
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceAfter, usage.user_id);
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
        VALUES (?, 'refund', ?, ?, ?, ?, ?)
      `).run(usage.user_id, usage.cost, user.balance, balanceAfter, reason || `${usage.model} 任务失败退款`, taskId);
      db.prepare('UPDATE token_usage SET status = ? WHERE id = ?').run('refunded', usage.id);
      db.prepare('COMMIT').run();
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }

    res.json({
      success: true,
      message: '退款成功',
      data: {
        taskId,
        refund: usage.cost,
        balance_after: balanceAfter,
      },
    });
  } catch (error) {
    console.error('Refund billing error:', error);
    res.status(500).json({ success: false, error: '退款失败' });
  }
});

export default router;
