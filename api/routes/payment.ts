import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../utils/auth.js';
import {
  closeRechargeOrder,
  completeRechargeOrder,
  createPaymentSession,
  extractCallbackAmount,
  getOrderForUser,
  getOrderByNo,
  logPaymentCallback,
  markExpiredIfNeeded,
  validateCallbackAmount,
  verifyPaymentCallback,
} from '../services/paymentService.js';

const router = Router();

/**
 * @openapi
 * /payment/create:
 *   post:
 *     tags: [支付]
 *     summary: 创建充值订单
 *     security: [bearerAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, paymentMethod]
 *             properties:
 *               amount: { type: number, example: 100, description: '充值金额（元）' }
 *               paymentMethod: { type: string, example: 'alipay', enum: [alipay, wechat] }
 *     responses:
 *       200:
 *         description: 返回订单信息和支付链接
 */

/**
 * @openapi
 * /payment/callback/{method}:
 *   post:
 *     tags: [支付]
 *     summary: 支付回调通知
 *     description: 由支付平台调用的回调接口
 *     parameters:
 *       - name: method
 *         in: path
 *         required: true
 *         schema: { type: string, enum: [alipay, wechat] }
 *     responses:
 *       200:
 *         description: 回调处理结果
 */

/**
 * @openapi
 * /payment/orders/{orderNo}/status:
 *   get:
 *     tags: [支付]
 *     summary: 查询订单支付状态
 *     security: [bearerAuth]
 *     parameters:
 *       - name: orderNo
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 返回订单状态
 */

router.get('/orders/:orderNo/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params;
    const foundOrder = getOrderForUser(orderNo, req.user?.id || 0);
    const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    res.json({
      success: true,
      data: {
        order_no: order.order_no,
        amount: order.amount,
        tokens: order.tokens,
        status: order.status,
        payment_method: order.payment_method,
        payment_time: order.payment_time,
        expires_at: order.expires_at,
        closed_at: order.closed_at,
        close_reason: order.close_reason,
        created_at: order.created_at,
        updated_at: order.updated_at,
        payment: createPaymentSession(order),
      },
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, error: '查询支付状态失败' });
  }
});

router.post('/orders/:orderNo/close', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params;
    const result = closeRechargeOrder(orderNo, req.user?.id || 0, req.body?.reason || '用户主动关闭订单');
    if (!result.success) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        order_no: result.order.order_no,
        status: result.order.status,
        close_reason: result.order.close_reason,
      },
    });
  } catch (error) {
    console.error('Close payment order error:', error);
    res.status(500).json({ success: false, error: '关闭订单失败' });
  }
});

router.post('/orders/:orderNo/pay', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params;
    const foundOrder = getOrderForUser(orderNo, req.user?.id || 0);
    const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    const session = createPaymentSession(order);
    if (session.mode !== 'mock') {
      res.status(400).json({ success: false, error: '当前订单不是模拟支付模式，请走真实支付入口' });
      return;
    }

    const result = completeRechargeOrder(orderNo, 'mock-pay', { userId: req.user?.id });
    if (!result.success) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        order_no: order.order_no,
        status: 'paid',
        tokens: order.tokens,
        balance_before: result.balance_before,
        balance_after: result.balance_after,
        already_paid: result.alreadyPaid,
      },
    });
  } catch (error) {
    console.error('Mock payment error:', error);
    res.status(500).json({ success: false, error: '模拟支付失败' });
  }
});

router.get('/:method/checkout/:orderNo', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { method, orderNo } = req.params;
    const foundOrder = getOrderForUser(orderNo, req.user?.id || 0);
    const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    const session = createPaymentSession(order);
    if (session.mode !== 'production') {
      res.status(400).json({ success: false, error: '当前为模拟支付模式，请调用模拟支付接口' });
      return;
    }

    res.json({
      success: true,
      data: {
        method,
        order_no: order.order_no,
        amount: order.amount,
        tokens: order.tokens,
        payment_url: session.payment_url,
        qr_code: session.qr_code,
        message: '真实支付下单响应占位：接入官方 SDK 后这里返回支付链接或二维码',
      },
    });
  } catch (error) {
    console.error('Payment checkout error:', error);
    res.status(500).json({ success: false, error: '创建支付入口失败' });
  }
});

router.post('/callback/:method', async (req: Request, res: Response): Promise<void> => {
  try {
    const { method } = req.params;
    const payload = req.body || {};
    const orderNo = payload.order_no || payload.out_trade_no || payload.outTradeNo;
    const callbackAmount = extractCallbackAmount(payload);

    if (!orderNo || typeof orderNo !== 'string') {
      res.status(400).json({ success: false, error: '缺少订单号' });
      logPaymentCallback({
        method,
        amount: callbackAmount,
        verificationStatus: 'invalid',
        processStatus: 'rejected',
        message: '缺少订单号',
        raw: payload,
      });
      return;
    }

    const foundOrder = getOrderByNo(orderNo);
    const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      logPaymentCallback({
        orderNo,
        method,
        amount: callbackAmount,
        verificationStatus: 'invalid',
        processStatus: 'rejected',
        message: '订单不存在',
        raw: payload,
      });
      return;
    }

    const verification = verifyPaymentCallback(method, payload);
    if (!verification.valid) {
      res.status(400).json({ success: false, error: verification.reason });
      logPaymentCallback({
        orderNo,
        method,
        amount: callbackAmount,
        verificationStatus: 'signature_failed',
        processStatus: 'rejected',
        message: verification.reason,
        raw: payload,
      });
      return;
    }

    const amountCheck = validateCallbackAmount(order, callbackAmount);
    if (!amountCheck.valid) {
      res.status(400).json({ success: false, error: amountCheck.reason });
      logPaymentCallback({
        orderNo,
        method,
        amount: callbackAmount,
        verificationStatus: 'amount_failed',
        processStatus: 'rejected',
        message: amountCheck.reason,
        raw: payload,
      });
      return;
    }

    const result = completeRechargeOrder(orderNo, `${method}-callback`, payload);
    if (!result.success) {
      res.status(result.status).json({ success: false, error: result.error });
      logPaymentCallback({
        orderNo,
        method,
        amount: callbackAmount,
        verificationStatus: 'verified',
        processStatus: 'failed',
        message: result.error,
        raw: payload,
      });
      return;
    }

    logPaymentCallback({
      orderNo,
      method,
      amount: callbackAmount,
      verificationStatus: 'verified',
      processStatus: result.alreadyPaid ? 'duplicate_ignored' : 'completed',
      message: result.message,
      raw: payload,
    });

    res.json({
      success: true,
      message: result.message,
      data: {
        order_no: orderNo,
        status: 'paid',
        already_paid: result.alreadyPaid,
      },
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ success: false, error: '支付回调处理失败' });
  }
});

export default router;
