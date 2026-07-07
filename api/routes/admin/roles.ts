import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, requirePermission, getClientIp, logOperation } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('role:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = db.prepare(`
      SELECT r.*,
             (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) as user_count
      FROM roles r
      ORDER BY r.id ASC
    `).all();

    for (const role of roles) {
      const permissions = db.prepare(`
        SELECT p.id, p.name, p.description, p.module, p.action
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
      `).all((role as { id: number }).id);
      (role as Record<string, unknown>).permissions = permissions;
    }

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, error: '获取角色列表失败' });
  }
});

router.get('/permissions', requirePermission('role:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = db.prepare('SELECT * FROM permissions ORDER BY module, id').all();
    
    const grouped: Record<string, typeof permissions> = {};
    for (const p of permissions) {
      const module = (p as { module: string }).module;
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(p);
    }

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ success: false, error: '获取权限列表失败' });
  }
});

router.get('/:id', requirePermission('role:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);

    if (!role) {
      res.status(404).json({ success: false, error: '角色不存在' });
      return;
    }

    const permissions = db.prepare(`
      SELECT p.id, p.name, p.description, p.module, p.action
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `).all(id);

    (role as Record<string, unknown>).permissions = permissions;

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ success: false, error: '获取角色信息失败' });
  }
});

router.post('/', requirePermission('role:create'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: '角色名称不能为空' });
      return;
    }

    const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(name);
    if (existing) {
      res.status(400).json({ success: false, error: '角色名称已存在' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO roles (name, description) VALUES (?, ?)'
    ).run(name, description || '');

    const roleId = result.lastInsertRowid;

    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const insertPerm = db.prepare(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
      );
      const insertPermMany = db.transaction((permIds: number[]) => {
        for (const permId of permIds) {
          insertPerm.run(roleId, permId);
        }
      });
      insertPermMany(permissions);
    }

    logOperation(
      req.user?.id,
      req.user?.username,
      'create_role',
      'role',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { roleId, roleName: name }
    );

    res.status(201).json({
      success: true,
      message: '角色创建成功',
      data: { id: roleId },
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, error: '创建角色失败' });
  }
});

router.put('/:id', requirePermission('role:edit'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    if (!role) {
      res.status(404).json({ success: false, error: '角色不存在' });
      return;
    }

    if (name) {
      const existing = db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').get(name, id);
      if (existing) {
        res.status(400).json({ success: false, error: '角色名称已存在' });
        return;
      }
      db.prepare(
        'UPDATE roles SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(name, description || '', id);
    } else if (description !== undefined) {
      db.prepare(
        'UPDATE roles SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(description, id);
    }

    if (permissions && Array.isArray(permissions)) {
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
      
      if (permissions.length > 0) {
        const insertPerm = db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );
        const insertPermMany = db.transaction((permIds: number[]) => {
          for (const permId of permIds) {
            insertPerm.run(id, permId);
          }
        });
        insertPermMany(permissions);
      }
    }

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_role',
      'role',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { roleId: parseInt(id) }
    );

    res.json({ success: true, message: '角色更新成功' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, error: '更新角色失败' });
  }
});

router.delete('/:id', requirePermission('role:delete'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const role = db.prepare('SELECT name FROM roles WHERE id = ?').get(id);
    if (!role) {
      res.status(404).json({ success: false, error: '角色不存在' });
      return;
    }

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(id) as { count: number };
    if (userCount.count > 0) {
      res.status(400).json({ success: false, error: '该角色下还有用户，无法删除' });
      return;
    }

    db.prepare('DELETE FROM roles WHERE id = ?').run(id);

    logOperation(
      req.user?.id,
      req.user?.username,
      'delete_role',
      'role',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { roleId: parseInt(id), roleName: (role as { name: string }).name }
    );

    res.json({ success: true, message: '角色删除成功' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ success: false, error: '删除角色失败' });
  }
});

export default router;
