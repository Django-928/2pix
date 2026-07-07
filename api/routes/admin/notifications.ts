import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, getClientIp, logOperation, requirePermission } from '../../utils/auth.js';
import { createNotification } from '../../services/notificationService.js';
import { getSystemConfig } from '../../utils/systemConfig.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('notification:manage'));

interface NotificationRow {
  id: number;
  user_id: number;
  username: string | null;
  email: string | null;
  type: string;
  title: string;
  content: string;
  read_at: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
}

const mapNotification = (item: NotificationRow) => ({
  id: item.id,
  userId: item.user_id,
  username: item.username,
  email: item.email,
  type: item.type,
  title: item.title,
  content: item.content,
  readAt: item.read_at,
  relatedType: item.related_type,
  relatedId: item.related_id,
  createdAt: item.created_at,
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 30));
    const type = String(req.query.type || '');
    const params: Array<string | number> = [];
    let where = 'WHERE 1 = 1';
    if (type) {
      where += ' AND n.type = ?';
      params.push(type);
    }

    const rows = db.prepare(`
      SELECT n.id, n.user_id, u.username, u.email, n.type, n.title, n.content, n.read_at, n.related_type, n.related_id, n.created_at
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ${where}
      ORDER BY n.id DESC
      LIMIT ?
    `).all(...params, pageSize) as NotificationRow[];

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN type = 'announcement' THEN 1 ELSE 0 END) as announcements,
        SUM(CASE WHEN DATE(created_at, 'localtime') = DATE('now', 'localtime') THEN 1 ELSE 0 END) as today
      FROM notifications
    `).get() as { total: number; unread: number | null; announcements: number | null; today: number | null };

    res.json({
      success: true,
      data: {
        list: rows.map(mapNotification),
        stats: {
          total: stats.total,
          unread: stats.unread || 0,
          announcements: stats.announcements || 0,
          today: stats.today || 0,
        },
      },
    });
  } catch (error) {
    console.error('List admin notifications error:', error);
    res.status(500).json({ success: false, error: '获取通知列表失败' });
  }
});

router.get('/users/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    if (!keyword) {
      res.json({ success: true, data: [] });
      return;
    }

    const rows = db.prepare(`
      SELECT id, username, email, nickname, status
      FROM users
      WHERE username LIKE ? OR email LIKE ? OR nickname LIKE ?
      ORDER BY id DESC
      LIMIT 20
    `).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Search notification users error:', error);
    res.status(500).json({ success: false, error: '搜索用户失败' });
  }
});

router.post('/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode, userIds, type, title, content, syncAnnouncement } = req.body as {
      mode?: 'all' | 'users';
      userIds?: number[];
      type?: string;
      title?: string;
      content?: string;
      syncAnnouncement?: boolean;
    };

    const normalizedTitle = String(title || '').trim().slice(0, 80);
    const normalizedContent = String(content || '').trim().slice(0, 2000);
    const normalizedType = String(type || 'system').trim().slice(0, 30) || 'system';

    if (!normalizedTitle || !normalizedContent) {
      res.status(400).json({ success: false, error: '标题和内容不能为空' });
      return;
    }

    let recipients: Array<{ id: number }> = [];
    if (mode === 'all') {
      recipients = db.prepare("SELECT id FROM users WHERE status = 'active'").all() as Array<{ id: number }>;
    } else {
      const ids = Array.isArray(userIds) ? Array.from(new Set(userIds.map((id) => Number(id)).filter(Boolean))).slice(0, 500) : [];
      if (ids.length === 0) {
        res.status(400).json({ success: false, error: '请选择至少一个接收用户' });
        return;
      }
      recipients = db.prepare(`SELECT id FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as Array<{ id: number }>;
    }

    const batchId = `admin-notice-${Date.now()}`;
    const transaction = db.transaction(() => {
      recipients.forEach((user) => {
        createNotification({
          userId: user.id,
          type: normalizedType,
          title: normalizedTitle,
          content: normalizedContent,
          relatedType: mode === 'all' ? 'broadcast' : 'direct',
          relatedId: batchId,
        });
      });

      if (syncAnnouncement) {
        const current = getSystemConfig();
        db.prepare(`
          INSERT INTO admin_configs (config_key, config_value, description, updated_by)
          VALUES ('system', ?, '系统基础配置', ?)
          ON CONFLICT(config_key) DO UPDATE SET
            config_value = excluded.config_value,
            updated_by = excluded.updated_by,
            updated_at = CURRENT_TIMESTAMP
        `).run(JSON.stringify({ ...current, announcement: normalizedContent }), req.user?.id || null);
      }
    });

    transaction();

    logOperation(
      req.user?.id,
      req.user?.username,
      syncAnnouncement ? 'send_announcement' : 'send_notification',
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      {
        mode,
        type: normalizedType,
        recipients: recipients.length,
        title: normalizedTitle,
        syncAnnouncement: Boolean(syncAnnouncement),
        batchId,
      }
    );

    res.status(201).json({
      success: true,
      message: '通知发送成功',
      data: {
        recipients: recipients.length,
        batchId,
        syncAnnouncement: Boolean(syncAnnouncement),
      },
    });
  } catch (error) {
    console.error('Send admin notification error:', error);
    res.status(500).json({ success: false, error: '发送通知失败' });
  }
});

export default router;
