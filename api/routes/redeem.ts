import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../utils/auth.js';
import { redeemCode, listRedeemRecords } from '../services/redeemCodeService.js';

const router = Router();

router.use(authMiddleware);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: '请输入兑换码' });
      return;
    }

    const result = redeemCode({
      code: code.trim().toUpperCase(),
      userId: req.user!.id,
      ipAddress: req.ip || undefined,
    });

    res.json({
      success: true,
      data: {
        tokens: result.tokens,
        balanceAfter: result.balanceAfter,
      },
    });
  } catch (error) {
    console.error('Redeem code error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '兑换失败',
    });
  }
});

router.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const data = listRedeemRecords({ userId: req.user!.id, page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    console.error('List user redeem records error:', error);
    res.status(500).json({ success: false, error: '获取兑换记录失败' });
  }
});

export default router;
