import express, { type Request, type Response } from 'express';
import db from '../db/index.js';
import { authMiddleware, getClientIp, logOperation } from '../utils/auth.js';
import { mapWork, type WorkRow } from '../services/workService.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * /works:
 *   get:
 *     tags: [作品]
 *     summary: 获取用户作品列表
 *     security: [bearerAuth]
 *     parameters:
 *       - name: type
 *         in: query
 *         schema: { type: string, enum: [image, video, audio] }
 *       - name: pageSize
 *         in: query
 *         schema: { type: integer, default: 50 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: 返回作品列表（自动过滤违规内容）
 */

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const type = String(req.query.type || '');
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

    const params: Array<string | number> = [req.user?.id || 0];
    let where = 'WHERE user_id = ?';
    if (['image', 'video', 'audio'].includes(type)) {
      where += ' AND type = ?';
      params.push(type);
    }
    // 过滤已违规的作品（用户看不到被标记违规的作品）
    where += ' AND (review_status IS NULL OR review_status != ?)';
    params.push('violated');

    const rows = db.prepare(`
      SELECT id, name, type, status, input_params, output_url, created_at, review_status
      FROM works
      ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as WorkRow[];

    res.json({
      success: true,
      data: rows.map(mapWork),
    });
  } catch (error) {
    console.error('List works error:', error);
    res.status(500).json({ success: false, error: '获取作品历史失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = db.prepare('SELECT id, name FROM works WHERE id = ? AND user_id = ?').get(req.params.id, req.user?.id) as { id: string; name: string } | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: '作品不存在' });
      return;
    }

    db.prepare('DELETE FROM works WHERE id = ? AND user_id = ?').run(req.params.id, req.user?.id);
    logOperation(req.user?.id, req.user?.username, 'delete_work', 'work', getClientIp(req), req.headers['user-agent'] || '', {
      workId: existing.id,
      name: existing.name,
    });

    res.json({ success: true, message: '作品已删除' });
  } catch (error) {
    console.error('Delete work error:', error);
    res.status(500).json({ success: false, error: '删除作品失败' });
  }
});

export default router;
