import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { authMiddleware, requirePermission, logOperation, getClientIp } from '../utils/auth.js';

const router = Router();

// ========== 公开接口（无需认证）==========

/** GET /models - 获取所有启用的模型定价（前端展示用） */
router.get('/models', (_req: Request, res: Response): void => {
  try {
    const category = _req.query.category as string | undefined;

    let sql = 'SELECT * FROM model_pricing WHERE enabled = 1';
    const params: (string | number)[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category ASC, cost_per_unit ASC';

    const pricing = db.prepare(sql).all(...params);
    res.json({ success: true, data: pricing });
  } catch (error) {
    console.error('Get pricing models error:', error);
    res.status(500).json({ success: false, error: '获取模型定价失败' });
  }
});

/** GET /estimate - 预估消耗积分 */
router.get('/estimate', (req: Request, res: Response): void => {
  try {
    const { model, category, input_tokens } = req.query;

    if (!model || !category) {
      res.status(400).json({ success: false, error: '模型和分类不能为空' });
      return;
    }

    const pricing = db.prepare('SELECT * FROM model_pricing WHERE local_model = ? AND enabled = 1').get(model as string) as {
      id: number;
      local_model: string;
      category: string;
      display_name: string;
      cost_per_unit: number;
      unit_type: string;
      unit_label: string;
    } | undefined;

    if (!pricing) {
      res.status(404).json({ success: false, error: '未找到该模型的定价信息' });
      return;
    }

    let estimatedCost: number;

    if (pricing.unit_type === 'per_1k_tokens') {
      // chat 类型：按千 token 计费
      const inputTokens = parseInt(input_tokens as string) || 0;
      const estimatedUnits = Math.max(1, Math.ceil(inputTokens / 1000));
      estimatedCost = estimatedUnits * pricing.cost_per_unit;
    } else {
      // per_call 或 per_minute：直接取单价
      estimatedCost = pricing.cost_per_unit;
    }

    res.json({
      success: true,
      data: {
        model: pricing.local_model,
        display_name: pricing.display_name,
        category: pricing.category,
        cost_per_unit: pricing.cost_per_unit,
        unit_type: pricing.unit_type,
        unit_label: pricing.unit_label,
        estimated_cost: estimatedCost,
      },
    });
  } catch (error) {
    console.error('Estimate pricing error:', error);
    res.status(500).json({ success: false, error: '预估积分失败' });
  }
});

/** GET /recharge-plans - 获取充值套餐列表 */
router.get('/recharge-plans', (_req: Request, res: Response): void => {
  try {
    const plans = db.prepare('SELECT * FROM recharge_plans WHERE enabled = 1 ORDER BY sort_order ASC').all();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get recharge plans error:', error);
    res.status(500).json({ success: false, error: '获取充值套餐失败' });
  }
});

// ========== 管理员接口（需要认证 + 权限）==========

/** GET /admin/models - 获取所有模型定价（含禁用的） */
router.get('/admin/models', authMiddleware, requirePermission('price:view'), (req: Request, res: Response): void => {
  try {
    const category = req.query.category as string | undefined;

    let sql = 'SELECT p.*, COALESCE(SUM(u.cost), 0) as total_cost, COUNT(u.id) as call_count FROM model_pricing p LEFT JOIN token_usage u ON p.local_model = u.model AND u.status = \'completed\' WHERE 1=1';
    const params: (string | number)[] = [];

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    sql += ' GROUP BY p.id ORDER BY p.category ASC, p.cost_per_unit ASC';

    const pricing = db.prepare(sql).all(...params);
    res.json({ success: true, data: pricing });
  } catch (error) {
    console.error('Get admin pricing models error:', error);
    res.status(500).json({ success: false, error: '获取模型定价失败' });
  }
});

/** PUT /admin/models - 批量更新模型定价 */
router.put('/admin/models', authMiddleware, requirePermission('price:edit'), (req: Request, res: Response): void => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: '请提供定价数据列表 items' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE model_pricing
      SET cost_per_unit = ?, unit_type = ?, unit_label = ?, description = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE local_model = ?
    `);
    const updateMany = db.transaction((list: Array<{
      local_model: string;
      cost_per_unit: number;
      unit_type: string;
      unit_label: string;
      description: string;
      enabled: number;
    }>) => {
      for (const item of list) {
        if (item.local_model && typeof item.cost_per_unit === 'number') {
          updateStmt.run(
            item.cost_per_unit,
            item.unit_type || 'per_call',
            item.unit_label || '次',
            item.description || '',
            item.enabled !== undefined ? (item.enabled ? 1 : 0) : 1,
            item.local_model,
          );
        }
      }
    });
    updateMany(items);

    logOperation(
      req.user?.id,
      req.user?.username,
      'batch_update_pricing',
      'price',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { count: items.length },
    );

    res.json({ success: true, message: '定价更新成功', data: { count: items.length } });
  } catch (error) {
    console.error('Update pricing models error:', error);
    res.status(500).json({ success: false, error: '更新模型定价失败' });
  }
});

/** PUT /admin/models/:model - 更新单个模型定价 */
router.put('/admin/models/:model', authMiddleware, requirePermission('price:edit'), (req: Request, res: Response): void => {
  try {
    const { model } = req.params;
    const { cost_per_unit, unit_type, unit_label, description, enabled, display_name } = req.body;

    const existing = db.prepare('SELECT * FROM model_pricing WHERE local_model = ?').get(model) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '模型定价记录不存在' });
      return;
    }

    const updateFields: string[] = [];
    const params: (string | number)[] = [];

    if (cost_per_unit !== undefined) { updateFields.push('cost_per_unit = ?'); params.push(cost_per_unit); }
    if (unit_type !== undefined) { updateFields.push('unit_type = ?'); params.push(unit_type); }
    if (unit_label !== undefined) { updateFields.push('unit_label = ?'); params.push(unit_label); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (enabled !== undefined) { updateFields.push('enabled = ?'); params.push(enabled ? 1 : 0); }
    if (display_name !== undefined) { updateFields.push('display_name = ?'); params.push(display_name); }

    if (updateFields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(model);

    db.prepare(`UPDATE model_pricing SET ${updateFields.join(', ')} WHERE local_model = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM model_pricing WHERE local_model = ?').get(model);

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_pricing',
      'price',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { model, changes: req.body },
    );

    res.json({ success: true, message: '定价更新成功', data: updated });
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ success: false, error: '更新模型定价失败' });
  }
});

/** POST /admin/models - 新增模型定价 */
router.post('/admin/models', authMiddleware, requirePermission('price:edit'), (req: Request, res: Response): void => {
  try {
    const { local_model, category, display_name, cost_per_unit, unit_type, unit_label, description, enabled } = req.body;

    if (!local_model || !category) {
      res.status(400).json({ success: false, error: '缺少必填字段（local_model, category）' });
      return;
    }

    const existing = db.prepare('SELECT id FROM model_pricing WHERE local_model = ?').get(local_model);
    if (existing) {
      res.status(409).json({ success: false, error: '该模型定价已存在' });
      return;
    }

    db.prepare(`
      INSERT INTO model_pricing (local_model, category, display_name, cost_per_unit, unit_type, unit_label, description, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      local_model,
      category,
      display_name || '',
      cost_per_unit || 1,
      unit_type || 'per_call',
      unit_label || '次',
      description || '',
      enabled !== undefined ? (enabled ? 1 : 0) : 1,
    );

    const pricing = db.prepare('SELECT * FROM model_pricing WHERE local_model = ?').get(local_model);

    logOperation(
      req.user?.id,
      req.user?.username,
      'create_pricing',
      'price',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { local_model, category, cost_per_unit },
    );

    res.status(201).json({ success: true, message: '模型定价创建成功', data: pricing });
  } catch (error) {
    console.error('Create pricing error:', error);
    res.status(500).json({ success: false, error: '创建模型定价失败' });
  }
});

/** GET /admin/recharge-plans - 获取所有充值套餐 */
router.get('/admin/recharge-plans', authMiddleware, requirePermission('price:view'), (_req: Request, res: Response): void => {
  try {
    const plans = db.prepare('SELECT * FROM recharge_plans ORDER BY sort_order ASC').all();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get admin recharge plans error:', error);
    res.status(500).json({ success: false, error: '获取充值套餐失败' });
  }
});

/** PUT /admin/recharge-plans - 批量更新充值套餐 */
router.put('/admin/recharge-plans', authMiddleware, requirePermission('price:edit'), (req: Request, res: Response): void => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: '请提供充值套餐数据列表 items' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE recharge_plans
      SET name = ?, credits = ?, price_yuan = ?, bonus_credits = ?, enabled = ?, sort_order = ?
      WHERE id = ?
    `);
    const updateMany = db.transaction((list: Array<{
      id: number;
      name: string;
      credits: number;
      price_yuan: number;
      bonus_credits: number;
      enabled: number;
      sort_order: number;
    }>) => {
      for (const item of list) {
        if (item.id) {
          updateStmt.run(
            item.name,
            item.credits,
            item.price_yuan,
            item.bonus_credits || 0,
            item.enabled !== undefined ? (item.enabled ? 1 : 0) : 1,
            item.sort_order ?? 0,
            item.id,
          );
        }
      }
    });
    updateMany(items);

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_recharge_plans',
      'price',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { count: items.length },
    );

    res.json({ success: true, message: '充值套餐更新成功', data: { count: items.length } });
  } catch (error) {
    console.error('Update recharge plans error:', error);
    res.status(500).json({ success: false, error: '更新充值套餐失败' });
  }
});

export default router;
