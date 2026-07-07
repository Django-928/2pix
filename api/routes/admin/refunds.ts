import { Router, type Request, type Response } from 'express';
import { authMiddleware, requirePermission } from '../../utils/auth.js';
import db from '../../db/index.js';
import { refundOrder, listRefunds, getRefundsByOrder } from '../../services/refundService.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('billing:manage'));

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const data = listRefunds({ status, keyword, page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    console.error('List refunds error:', error);
    res.status(500).json({ success: false, error: '获取退款记录失败' });
  }
});

router.post('/orders/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const { amount, reason } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ success: false, error: '退款金额必须大于 0' });
      return;
    }
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, error: '请输入退款原因' });
      return;
    }

    const order = db.prepare('SELECT id, order_no, user_id, amount, status FROM orders WHERE id = ?').get(orderId) as {
      id: number;
      order_no: string;
      user_id: number;
      amount: number;
      status: string;
    } | undefined;

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    if (order.status !== 'paid') {
      res.status(400).json({ success: false, error: '只能对已支付订单退款' });
      return;
    }

    const result = refundOrder({
      orderId: order.id,
      orderNo: order.order_no,
      userId: order.user_id,
      amount: Number(amount),
      reason: String(reason).trim(),
      processedBy: req.user!.id,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Refund order error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '退款失败',
    });
  }
});

router.get('/orders/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = Number(req.params.id);
    const data = getRefundsByOrder(orderId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get order refunds error:', error);
    res.status(500).json({ success: false, error: '获取订单退款记录失败' });
  }
});

export default router;
