import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, getClientIp, logOperation, requirePermission } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('work:review'));

const VALID_REVIEW_STATUSES = ['pending', 'approved', 'violated', 'taken_down'];
const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  violated: '违规',
  taken_down: '已下架',
};

interface AdminWorkRow {
  id: string;
  user_id: number;
  username: string | null;
  email: string | null;
  name: string;
  type: string;
  status: string;
  input_params: string;
  output_url: string | null;
  provider: string | null;
  model: string | null;
  review_status: string;
  review_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const parseInputParams = (value: string) => {
  try {
    return JSON.parse(value || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
};

const mapWork = (row: AdminWorkRow) => ({
  id: row.id,
  userId: row.user_id,
  username: row.username,
  email: row.email,
  name: row.name,
  type: row.type,
  status: row.status,
  inputParams: parseInputParams(row.input_params),
  outputUrl: row.output_url,
  provider: row.provider,
  model: row.model,
  reviewStatus: row.review_status || 'pending',
  reviewReason: row.review_reason,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// 作品列表
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const type = String(req.query.type || '');
    const status = String(req.query.status || '');
    const reviewStatus = String(req.query.reviewStatus || '');
    const keyword = String(req.query.keyword || '').trim();
    const userId = String(req.query.userId || '').trim();

    const params: Array<string | number> = [];
    let where = 'WHERE 1 = 1';

    if (['image', 'video', 'audio'].includes(type)) {
      where += ' AND w.type = ?';
      params.push(type);
    }
    if (['pending', 'complete', 'failed'].includes(status)) {
      where += ' AND w.status = ?';
      params.push(status);
    }
    if (VALID_REVIEW_STATUSES.includes(reviewStatus)) {
      where += ' AND w.review_status = ?';
      params.push(reviewStatus);
    }
    if (userId) {
      where += ' AND w.user_id = ?';
      params.push(Number(userId));
    }
    if (keyword) {
      where += ' AND (w.name LIKE ? OR w.model LIKE ? OR w.provider LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR w.input_params LIKE ?)';
      const like = `%${keyword}%`;
      params.push(like, like, like, like, like, like);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM works w
      LEFT JOIN users u ON w.user_id = u.id
      ${where}
    `).get(...params) as { count: number };

    const rows = db.prepare(`
      SELECT w.id, w.user_id, u.username, u.email, w.name, w.type, w.status, w.input_params, w.output_url, w.provider, w.model,
             w.review_status, w.review_reason, w.reviewed_by, w.reviewed_at, w.created_at, w.updated_at
      FROM works w
      LEFT JOIN users u ON w.user_id = u.id
      ${where}
      ORDER BY w.created_at DESC, w.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, (page - 1) * pageSize) as AdminWorkRow[];

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as image,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as video,
        SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) as audio,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN DATE(created_at, 'localtime') = DATE('now', 'localtime') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN review_status = 'violated' THEN 1 ELSE 0 END) as violated,
        SUM(CASE WHEN review_status = 'taken_down' THEN 1 ELSE 0 END) as taken_down
      FROM works
    `).get() as {
      total: number;
      image: number | null; video: number | null; audio: number | null; failed: number | null;
      today: number | null; pending_review: number | null; violated: number | null; taken_down: number | null;
    };

    res.json({
      success: true,
      data: {
        list: rows.map(mapWork),
        total: total.count,
        page,
        pageSize,
        stats: {
          total: stats.total,
          image: stats.image || 0,
          video: stats.video || 0,
          audio: stats.audio || 0,
          failed: stats.failed || 0,
          today: stats.today || 0,
          pendingReview: stats.pending_review || 0,
          violated: stats.violated || 0,
          takenDown: stats.taken_down || 0,
        },
      },
    });
  } catch (error) {
    console.error('List admin works error:', error);
    res.status(500).json({ success: false, error: '获取作品列表失败' });
  }
});

// 作品详情
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const row = db.prepare(`
      SELECT w.id, w.user_id, u.username, u.email, w.name, w.type, w.status, w.input_params, w.output_url, w.provider, w.model,
             w.review_status, w.review_reason, w.reviewed_by, w.reviewed_at, w.created_at, w.updated_at
      FROM works w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `).get(req.params.id) as AdminWorkRow | undefined;

    if (!row) {
      res.status(404).json({ success: false, error: '作品不存在' });
      return;
    }

    const userStats = db.prepare(`
      SELECT
        COUNT(*) as total_works,
        COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE user_id = ? AND amount < 0), 0) as total_spent,
        COALESCE((SELECT COUNT(*) FROM token_usage WHERE user_id = ?), 0) as total_calls
      FROM works
      WHERE user_id = ?
    `).get(row.user_id, row.user_id, row.user_id) as { total_works: number; total_spent: number; total_calls: number };

    // 获取审核人信息
    let reviewedByUsername: string | null = null;
    if (row.reviewed_by) {
      const reviewer = db.prepare('SELECT username FROM users WHERE id = ?').get(row.reviewed_by) as { username: string } | undefined;
      reviewedByUsername = reviewer?.username || null;
    }

    res.json({
      success: true,
      data: {
        ...mapWork(row),
        reviewedByUsername,
        userStats: {
          totalWorks: userStats.total_works,
          totalSpent: userStats.total_spent,
          totalCalls: userStats.total_calls,
        },
      },
    });
  } catch (error) {
    console.error('Get admin work detail error:', error);
    res.status(500).json({ success: false, error: '获取作品详情失败' });
  }
});

// 审核作品
router.put('/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewStatus, reviewReason } = req.body;

    if (!VALID_REVIEW_STATUSES.includes(reviewStatus)) {
      res.status(400).json({ success: false, error: `无效的审核状态，可选值：${VALID_REVIEW_STATUSES.join(', ')}` });
      return;
    }

    const row = db.prepare(`
      SELECT w.id, w.user_id, w.name, w.type, w.status, w.output_url, w.review_status
      FROM works w
      WHERE w.id = ?
    `).get(req.params.id) as {
      id: string; user_id: number; name: string; type: string; status: string; output_url: string | null; review_status: string;
    } | undefined;

    if (!row) {
      res.status(404).json({ success: false, error: '作品不存在' });
      return;
    }

    if (row.status !== 'complete') {
      res.status(400).json({ success: false, error: '只能审核已完成的作品' });
      return;
    }

    const adminId = req.user?.id || 0;
    const adminUsername = req.user?.username || 'admin';
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE works SET review_status = ?, review_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(reviewStatus, reviewReason || null, adminId, now, now, req.params.id);

    logOperation(adminId, adminUsername, 'admin_review_work', 'work', getClientIp(req), req.headers['user-agent'] || '', {
      workId: row.id,
      targetUserId: row.user_id,
      name: row.name,
      type: row.type,
      previousReviewStatus: row.review_status,
      newReviewStatus: reviewStatus,
      reviewReason: reviewReason || '',
    });

    res.json({
      success: true,
      message: `作品已标记为「${REVIEW_STATUS_LABELS[reviewStatus]}」`,
      data: { reviewStatus, reviewReason: reviewReason || null },
    });
  } catch (error) {
    console.error('Review admin work error:', error);
    res.status(500).json({ success: false, error: '审核作品失败' });
  }
});

// 批量审核
router.post('/batch-review', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, reviewStatus, reviewReason } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      res.status(400).json({ success: false, error: '请提供 1-100 个作品 ID' });
      return;
    }

    if (!VALID_REVIEW_STATUSES.includes(reviewStatus)) {
      res.status(400).json({ success: false, error: `无效的审核状态，可选值：${VALID_REVIEW_STATUSES.join(', ')}` });
      return;
    }

    const adminId = req.user?.id || 0;
    const adminUsername = req.user?.username || 'admin';
    const now = new Date().toISOString();

    const update = db.prepare(`
      UPDATE works SET review_status = ?, review_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ? AND status = 'complete'
    `);

    let updated = 0;
    const batchUpdate = db.transaction((workIds: string[]) => {
      for (const id of workIds) {
        const result = update.run(reviewStatus, reviewReason || null, adminId, now, now, id);
        if (result.changes > 0) updated++;
      }
    });

    batchUpdate(ids);

    logOperation(adminId, adminUsername, 'admin_batch_review_work', 'work', getClientIp(req), req.headers['user-agent'] || '', {
      ids,
      reviewStatus,
      reviewReason: reviewReason || '',
      updatedCount: updated,
      totalRequested: ids.length,
    });

    res.json({
      success: true,
      message: `批量审核完成，已更新 ${updated} 条记录`,
      data: { updated, requested: ids.length },
    });
  } catch (error) {
    console.error('Batch review admin works error:', error);
    res.status(500).json({ success: false, error: '批量审核失败' });
  }
});

// 删除作品
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const row = db.prepare('SELECT id, user_id, name, type, output_url FROM works WHERE id = ?').get(req.params.id) as {
      id: string;
      user_id: number;
      name: string;
      type: string;
      output_url: string | null;
    } | undefined;

    if (!row) {
      res.status(404).json({ success: false, error: '作品不存在' });
      return;
    }

    db.prepare('DELETE FROM works WHERE id = ?').run(req.params.id);

    logOperation(req.user?.id, req.user?.username, 'admin_delete_work', 'work', getClientIp(req), req.headers['user-agent'] || '', {
      workId: row.id,
      targetUserId: row.user_id,
      name: row.name,
      type: row.type,
      outputUrl: row.output_url,
    });

    res.json({ success: true, message: '作品已删除' });
  } catch (error) {
    console.error('Delete admin work error:', error);
    res.status(500).json({ success: false, error: '删除作品失败' });
  }
});

export { REVIEW_STATUS_LABELS };
export default router;
