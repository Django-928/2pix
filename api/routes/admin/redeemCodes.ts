import { Router, type Request, type Response } from 'express';
import { authMiddleware, requirePermission } from '../../utils/auth.js';
import {
  createRedeemCodes,
  listRedeemCodes,
  updateRedeemCode,
  deleteRedeemCode,
  listRedeemRecords,
} from '../../services/redeemCodeService.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('system:config'));

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const data = listRedeemCodes({ status, keyword, page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    console.error('List redeem codes error:', error);
    res.status(500).json({ success: false, error: '获取兑换码列表失败' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { count, tokens, totalUsage, validStart, validEnd, description } = req.body || {};

    if (!count || count < 1 || count > 100) {
      res.status(400).json({ success: false, error: '生成数量需在 1-100 之间' });
      return;
    }
    if (tokens === undefined || tokens < 1) {
      res.status(400).json({ success: false, error: '兑换积分必须大于 0' });
      return;
    }

    const codes = createRedeemCodes({
      count: Number(count),
      tokens: Number(tokens),
      totalUsage: totalUsage ? Number(totalUsage) : 1,
      validStart,
      validEnd,
      description,
      createdBy: req.user?.id,
    });

    res.json({ success: true, data: codes });
  } catch (error) {
    console.error('Create redeem codes error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '生成兑换码失败',
    });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status, description, validStart, validEnd } = req.body || {};

    const code = updateRedeemCode(id, { status, description, validStart, validEnd });
    if (!code) {
      res.status(404).json({ success: false, error: '兑换码不存在' });
      return;
    }

    res.json({ success: true, data: code });
  } catch (error) {
    console.error('Update redeem code error:', error);
    res.status(500).json({ success: false, error: '更新兑换码失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const ok = deleteRedeemCode(id);
    if (!ok) {
      res.status(404).json({ success: false, error: '兑换码不存在' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete redeem code error:', error);
    res.status(500).json({ success: false, error: '删除兑换码失败' });
  }
});

router.get('/:id/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const codeId = Number(req.params.id);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const data = listRedeemRecords({ codeId, page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    console.error('List redeem records error:', error);
    res.status(500).json({ success: false, error: '获取兑换记录失败' });
  }
});

export default router;
