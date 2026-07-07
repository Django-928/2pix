import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, requirePermission } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);

const securityActions = [
  'login_failed',
  'account_locked',
  'change_password',
  'update_user_status',
  'adjust_balance',
  'delete_user',
  'update_config',
  'create_api_key',
  'update_api_key',
  'delete_api_key',
  'deactivate_account',
];

const securityModules = ['auth', 'user', 'system', 'billing', 'api_key'];

router.get('/', requirePermission('log:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string || '';
    const module = req.query.module as string || '';
    const action = req.query.action as string || '';
    const userId = req.query.userId as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';
    const security = req.query.security as string || '';

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ' AND (ol.username LIKE ? OR ol.details LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (module) {
      whereClause += ' AND ol.module = ?';
      params.push(module);
    }
    if (action) {
      whereClause += ' AND ol.action = ?';
      params.push(action);
    }
    if (userId) {
      whereClause += ' AND ol.user_id = ?';
      params.push(parseInt(userId));
    }
    if (startDate) {
      whereClause += ' AND ol.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND ol.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }
    if (security === '1') {
      whereClause += ` AND (ol.action IN (${securityActions.map(() => '?').join(',')}) OR ol.module IN (${securityModules.map(() => '?').join(',')}))`;
      params.push(...securityActions, ...securityModules);
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM operation_logs ol ${whereClause}`
    ).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const logs = db.prepare(`
      SELECT ol.*, u.avatar as user_avatar
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      ${whereClause}
      ORDER BY ol.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        list: logs,
        total: countResult.total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, error: '获取日志列表失败' });
  }
});

router.get('/:id', requirePermission('log:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const log = db.prepare(`
      SELECT ol.*, u.avatar as user_avatar
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE ol.id = ?
    `).get(id);

    if (!log) {
      res.status(404).json({ success: false, error: '日志不存在' });
      return;
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ success: false, error: '获取日志详情失败' });
  }
});

router.get('/stats/summary', requirePermission('log:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const today = db.prepare(
      "SELECT COUNT(*) as count FROM operation_logs WHERE DATE(created_at) = DATE('now')"
    ).get() as { count: number };

    const moduleStats = db.prepare(`
      SELECT module, COUNT(*) as count
      FROM operation_logs
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY module
      ORDER BY count DESC
    `).all();

    const actionStats = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM operation_logs
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const todaySecurity = db.prepare(`
      SELECT COUNT(*) as count
      FROM operation_logs
      WHERE DATE(created_at) = DATE('now')
        AND (action IN (${securityActions.map(() => '?').join(',')}) OR module IN (${securityModules.map(() => '?').join(',')}))
    `).get(...securityActions, ...securityModules) as { count: number };

    const loginFailures = db.prepare(`
      SELECT COUNT(*) as count
      FROM operation_logs
      WHERE action IN ('login_failed', 'account_locked') AND created_at >= datetime('now', '-7 days')
    `).get() as { count: number };

    const lockedAccounts = db.prepare(`
      SELECT COUNT(*) as count
      FROM login_failures
      WHERE locked_until IS NOT NULL AND DATETIME(locked_until) > DATETIME('now')
    `).get() as { count: number };

    const sensitiveChanges = db.prepare(`
      SELECT COUNT(*) as count
      FROM operation_logs
      WHERE created_at >= datetime('now', '-7 days')
        AND action IN ('update_config', 'update_user_status', 'adjust_balance', 'delete_user', 'change_password', 'delete_api_key')
    `).get() as { count: number };

    const abnormalCallbacks = db.prepare(`
      SELECT COUNT(*) as count
      FROM payment_callbacks
      WHERE created_at >= datetime('now', '-7 days')
        AND (process_status IN ('rejected', 'failed') OR verification_status IN ('amount_failed', 'signature_failed', 'invalid'))
    `).get() as { count: number };

    const securityEvents = db.prepare(`
      SELECT ol.*, u.avatar as user_avatar
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE ol.action IN (${securityActions.map(() => '?').join(',')}) OR ol.module IN (${securityModules.map(() => '?').join(',')})
      ORDER BY ol.id DESC
      LIMIT 8
    `).all(...securityActions, ...securityModules);

    const topRiskIps = db.prepare(`
      SELECT ip_address, COUNT(*) as count, MAX(created_at) as last_seen
      FROM operation_logs
      WHERE created_at >= datetime('now', '-7 days')
        AND ip_address IS NOT NULL
        AND ip_address != ''
        AND (action IN (${securityActions.map(() => '?').join(',')}) OR module IN (${securityModules.map(() => '?').join(',')}))
      GROUP BY ip_address
      ORDER BY count DESC, last_seen DESC
      LIMIT 8
    `).all(...securityActions, ...securityModules);

    res.json({
      success: true,
      data: {
        todayCount: today.count,
        moduleStats,
        actionStats,
        security: {
          todaySecurity: todaySecurity.count,
          loginFailures: loginFailures.count,
          lockedAccounts: lockedAccounts.count,
          sensitiveChanges: sensitiveChanges.count,
          abnormalCallbacks: abnormalCallbacks.count,
          events: securityEvents,
          topRiskIps,
        },
      },
    });
  } catch (error) {
    console.error('Get log stats error:', error);
    res.status(500).json({ success: false, error: '获取日志统计失败' });
  }
});

export default router;
