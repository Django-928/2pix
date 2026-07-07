import express, { type Request, type Response } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../utils/auth.js';

const router = express.Router();

router.use(authMiddleware);

interface NotificationRow {
  id: number;
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
    const list = db.prepare(`
      SELECT id, type, title, content, read_at, related_type, related_id, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(req.user?.id, pageSize) as NotificationRow[];

    const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL').get(req.user?.id) as { count: number };

    res.json({
      success: true,
      data: {
        list: list.map(mapNotification),
        unread: unread.count,
      },
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ success: false, error: '获取消息失败' });
  }
});

router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL').get(req.user?.id) as { count: number };
    res.json({ success: true, data: { unread: unread.count } });
  } catch (error) {
    console.error('Get unread notifications error:', error);
    res.status(500).json({ success: false, error: '获取未读消息数失败' });
  }
});

router.post('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL').run(req.user?.id);
    res.json({ success: true, message: '已全部标记为已读' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ success: false, error: '标记已读失败' });
  }
});

export default router;
