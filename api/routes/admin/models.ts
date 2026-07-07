import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, getClientIp, logOperation, requirePermission } from '../../utils/auth.js';

// ========== 管理员路由（需要认证 + 权限）==========
const adminRouter = Router();

adminRouter.use(authMiddleware);

/** GET / - 获取所有模型（支持 ?category= 过滤） */
adminRouter.get('/', requirePermission('model:view'), (req: Request, res: Response): void => {
  try {
    const category = req.query.category as string | undefined;

    let sql = 'SELECT * FROM ai_models WHERE 1=1';
    const params: (string | number)[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, sort_order ASC, created_at ASC';

    const models = db.prepare(sql).all(...params);
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ success: false, error: '获取模型列表失败' });
  }
});

/** POST / - 新增模型 */
adminRouter.post('/', requirePermission('model:create'), (req: Request, res: Response): void => {
  try {
    const { id, name, description, icon, category, status, sort_order, is_new, is_hot } = req.body;

    if (!id || !name || !category) {
      res.status(400).json({ success: false, error: '缺少必填字段（id, name, category）' });
      return;
    }

    const validCategories = ['chat', 'image', 'video', 'audio'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ success: false, error: `无效的模型类别，可选值：${validCategories.join(', ')}` });
      return;
    }

    const existing = db.prepare('SELECT id FROM ai_models WHERE id = ?').get(id);
    if (existing) {
      res.status(409).json({ success: false, error: '模型 ID 已存在' });
      return;
    }

    db.prepare(`
      INSERT INTO ai_models (id, name, description, icon, category, status, sort_order, is_new, is_hot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || '',
      icon || '✨',
      category,
      status || 'active',
      sort_order ?? 0,
      is_new ? 1 : 0,
      is_hot ? 1 : 0,
    );

    const model = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id);

    logOperation(
      req.user?.id,
      req.user?.username,
      'create_model',
      'model',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { modelId: id, modelName: name, category },
    );

    res.status(201).json({ success: true, message: '模型创建成功', data: model });
  } catch (error) {
    console.error('Create model error:', error);
    res.status(500).json({ success: false, error: '创建模型失败' });
  }
});

/** PUT /:id - 更新模型 */
adminRouter.put('/:id', requirePermission('model:edit'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, description, icon, category, status, sort_order, is_new, is_hot } = req.body;

    const existing = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '模型不存在' });
      return;
    }

    if (category) {
      const validCategories = ['chat', 'image', 'video', 'audio'];
      if (!validCategories.includes(category)) {
        res.status(400).json({ success: false, error: `无效的模型类别，可选值：${validCategories.join(', ')}` });
        return;
      }
    }

    const updateFields: string[] = [];
    const params: (string | number)[] = [];

    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (icon !== undefined) { updateFields.push('icon = ?'); params.push(icon); }
    if (category !== undefined) { updateFields.push('category = ?'); params.push(category); }
    if (status !== undefined) { updateFields.push('status = ?'); params.push(status); }
    if (sort_order !== undefined) { updateFields.push('sort_order = ?'); params.push(sort_order); }
    if (is_new !== undefined) { updateFields.push('is_new = ?'); params.push(is_new ? 1 : 0); }
    if (is_hot !== undefined) { updateFields.push('is_hot = ?'); params.push(is_hot ? 1 : 0); }

    if (updateFields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    updateFields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE ai_models SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

    const model = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id);

    // 记录变更的字段
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of updateFields) {
      const fieldName = field.split(' = ')[0].trim();
      if (fieldName !== 'updated_at' && existing[fieldName] !== undefined) {
        changes[fieldName] = { from: existing[fieldName], to: req.body[fieldName] };
      }
    }

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_model',
      'model',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { modelId: id, changes },
    );

    res.json({ success: true, message: '模型更新成功', data: model });
  } catch (error) {
    console.error('Update model error:', error);
    res.status(500).json({ success: false, error: '更新模型失败' });
  }
});

/** PUT /reorder - 批量更新排序 */
adminRouter.put('/reorder', requirePermission('model:edit'), (req: Request, res: Response): void => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: '请提供排序数据列表 items' });
      return;
    }

    const updateStmt = db.prepare('UPDATE ai_models SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const reorderMany = db.transaction((reorderList: Array<{ id: string; sort_order: number }>) => {
      for (const item of reorderList) {
        if (item.id && typeof item.sort_order === 'number') {
          updateStmt.run(item.sort_order, item.id);
        }
      }
    });
    reorderMany(items);

    logOperation(
      req.user?.id,
      req.user?.username,
      'reorder_models',
      'model',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { count: items.length },
    );

    res.json({ success: true, message: '排序更新成功', data: { count: items.length } });
  } catch (error) {
    console.error('Reorder models error:', error);
    res.status(500).json({ success: false, error: '更新排序失败' });
  }
});

/** DELETE /:id - 软删除模型（status = 'inactive'） */
adminRouter.delete('/:id', requirePermission('model:delete'), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM ai_models WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '模型不存在' });
      return;
    }

    if (existing.status === 'inactive') {
      res.status(400).json({ success: false, error: '模型已被删除' });
      return;
    }

    db.prepare(`
      UPDATE ai_models
      SET status = 'inactive', updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    logOperation(
      req.user?.id,
      req.user?.username,
      'delete_model',
      'model',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { modelId: id, modelName: existing.name, previousStatus: existing.status },
    );

    res.json({ success: true, message: '模型已删除' });
  } catch (error) {
    console.error('Delete model error:', error);
    res.status(500).json({ success: false, error: '删除模型失败' });
  }
});

// ========== 公开路由（无需认证）==========
const publicRouter = Router();

/** GET / - 获取活跃模型列表（前台工作台用） */
publicRouter.get('/', (req: Request, res: Response): void => {
  try {
    const category = req.query.category as string | undefined;

    let sql = "SELECT * FROM ai_models WHERE status = 'active'";
    const params: (string | number)[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, sort_order ASC, created_at ASC';

    const models = db.prepare(sql).all(...params);
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('Get public models error:', error);
    res.status(500).json({ success: false, error: '获取模型列表失败' });
  }
});

export default adminRouter;
export { publicRouter };
