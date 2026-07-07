import { Router, type Request, type Response } from 'express';
import { authMiddleware, requirePermission } from '../../utils/auth.js';
import { listPlans, createPlan, updatePlan, deletePlan, seedDefaultPlans } from '../../services/membershipPlanService.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('system:config'));

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const data = listPlans({ status, page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    console.error('List membership plans error:', error);
    res.status(500).json({ success: false, error: '获取套餐列表失败' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, amount, tokens, badge, tone, description, sort_order, status } = req.body || {};

    if (!name || amount === undefined || tokens === undefined) {
      res.status(400).json({ success: false, error: '名称、价格和积分不能为空' });
      return;
    }

    const plan = createPlan({
      name: String(name),
      amount: Number(amount),
      tokens: Number(tokens),
      badge: badge ? String(badge) : null,
      tone: tone ? String(tone) : null,
      description: description ? String(description) : null,
      sort_order: sort_order !== undefined ? Number(sort_order) : 0,
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Create membership plan error:', error);
    res.status(500).json({ success: false, error: '创建套餐失败' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, amount, tokens, badge, tone, description, sort_order, status } = req.body || {};

    const updates: Parameters<typeof updatePlan>[1] = {};
    if (name !== undefined) updates.name = String(name);
    if (amount !== undefined) updates.amount = Number(amount);
    if (tokens !== undefined) updates.tokens = Number(tokens);
    if (badge !== undefined) updates.badge = String(badge);
    if (tone !== undefined) updates.tone = String(tone);
    if (description !== undefined) updates.description = String(description);
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);
    if (status !== undefined) updates.status = status === 'inactive' ? 'inactive' : 'active';

    const plan = updatePlan(id, updates);
    if (!plan) {
      res.status(404).json({ success: false, error: '套餐不存在' });
      return;
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Update membership plan error:', error);
    res.status(500).json({ success: false, error: '更新套餐失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const ok = deletePlan(id);
    if (!ok) {
      res.status(404).json({ success: false, error: '套餐不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete membership plan error:', error);
    res.status(500).json({ success: false, error: '删除套餐失败' });
  }
});

router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    void req;
    seedDefaultPlans();
    const data = listPlans({ status: 'active' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Seed membership plans error:', error);
    res.status(500).json({ success: false, error: '初始化默认套餐失败' });
  }
});

export default router;
