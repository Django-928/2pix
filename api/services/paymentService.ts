import db from '../db/index.js';
import { getSystemConfig } from '../utils/systemConfig.js';
import { createNotification } from './notificationService.js';

type PaymentMode = 'mock' | 'production';
type PaymentMethod = 'mock' | 'alipay' | 'wechat';

interface PaymentConfig {
  mode: PaymentMode;
  alipay?: { enabled?: boolean; notifyUrl?: string; returnUrl?: string };
  wechat?: { enabled?: boolean; notifyUrl?: string };
}

export interface RechargeOrder {
  id: number;
  order_no: string;
  user_id: number;
  amount: number;
  tokens: number;
  status: string;
  payment_method: PaymentMethod | string;
  payment_time?: string | null;
  expires_at?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSession {
  order_no: string;
  status: string;
  mode: PaymentMode;
  payment_method: PaymentMethod | string;
  payment_url?: string;
  qr_code?: string;
  message: string;
}

interface CallbackLogInput {
  orderNo?: string;
  method: string;
  eventType?: string;
  amount?: number;
  verificationStatus: string;
  processStatus: string;
  message?: string;
  raw?: unknown;
}

const defaultPaymentConfig: PaymentConfig = {
  mode: 'mock',
  alipay: { enabled: false },
  wechat: { enabled: false },
};

function readPaymentConfig(): PaymentConfig {
  const row = db.prepare('SELECT config_value FROM admin_configs WHERE config_key = ?').get('payment') as { config_value: string } | undefined;
  if (!row?.config_value) return defaultPaymentConfig;

  try {
    return { ...defaultPaymentConfig, ...JSON.parse(row.config_value) };
  } catch {
    return defaultPaymentConfig;
  }
}

export function normalizePaymentMethod(method?: string): PaymentMethod {
  if (method === 'alipay' || method === 'wechat') return method;
  return 'mock';
}

export function getOrderForUser(orderNo: string, userId: number): RechargeOrder | undefined {
  return db.prepare(`
    SELECT id, order_no, user_id, amount, tokens, status, payment_method, payment_time, expires_at, closed_at, close_reason, created_at, updated_at
    FROM orders
    WHERE order_no = ? AND user_id = ?
  `).get(orderNo, userId) as RechargeOrder | undefined;
}

export function getOrderByNo(orderNo: string): RechargeOrder | undefined {
  return db.prepare(`
    SELECT id, order_no, user_id, amount, tokens, status, payment_method, payment_time, expires_at, closed_at, close_reason, created_at, updated_at
    FROM orders
    WHERE order_no = ?
  `).get(orderNo) as RechargeOrder | undefined;
}

function getMethodLabel(method: string) {
  if (method === 'wechat') return '微信';
  if (method === 'alipay') return '支付宝';
  return '模拟支付';
}

export function isOrderExpired(order: RechargeOrder) {
  if (!order.expires_at) return false;
  const result = db.prepare('SELECT CASE WHEN DATETIME(?) <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END as expired').get(order.expires_at) as {
    expired: number;
  };
  return result.expired === 1;
}

export function markExpiredIfNeeded(order: RechargeOrder) {
  if (order.status !== 'pending' || !isOrderExpired(order)) return order;
  db.prepare(`
    UPDATE orders
    SET status = 'expired', closed_at = CURRENT_TIMESTAMP, close_reason = '订单超时未支付', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `).run(order.id);
  return { ...order, status: 'expired', closed_at: new Date().toISOString(), close_reason: '订单超时未支付' };
}

export function closeRechargeOrder(orderNo: string, userId: number, reason = '用户主动关闭订单') {
  const order = getOrderForUser(orderNo, userId);
  if (!order) {
    return { success: false as const, status: 404, error: '订单不存在' };
  }

  const normalized = markExpiredIfNeeded(order);
  if (normalized.status === 'paid') {
    return { success: false as const, status: 400, error: '已支付订单不能关闭' };
  }
  if (normalized.status !== 'pending') {
    return { success: true as const, order: normalized, message: '订单已关闭或已过期' };
  }

  db.prepare(`
    UPDATE orders
    SET status = 'closed', closed_at = CURRENT_TIMESTAMP, close_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `).run(reason, normalized.id);

  return {
    success: true as const,
    order: { ...normalized, status: 'closed', close_reason: reason },
    message: '订单已关闭',
  };
}

export function logPaymentCallback(input: CallbackLogInput) {
  db.prepare(`
    INSERT INTO payment_callbacks (
      order_no, payment_method, event_type, amount, verification_status, process_status, message, raw_payload
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.orderNo || null,
    input.method,
    input.eventType || 'callback',
    input.amount ?? null,
    input.verificationStatus,
    input.processStatus,
    input.message || '',
    JSON.stringify(input.raw ?? {})
  );
}

export function extractCallbackAmount(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  const rawAmount = data.amount ?? data.total_amount ?? data.totalAmount ?? data.payer_total ?? data.total;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') return undefined;
  const amount = Number(rawAmount);
  return Number.isFinite(amount) ? amount : undefined;
}

export function validateCallbackAmount(order: RechargeOrder, callbackAmount?: number) {
  if (callbackAmount === undefined) {
    return { valid: true, reason: '回调未携带金额，跳过金额校验' };
  }
  const valid = Math.abs(Number(order.amount) - callbackAmount) < 0.001;
  return {
    valid,
    reason: valid ? '金额校验通过' : `回调金额 ${callbackAmount} 与订单金额 ${order.amount} 不一致`,
  };
}

export function createPaymentSession(order: RechargeOrder): PaymentSession {
  const normalizedOrder = markExpiredIfNeeded(order);
  const config = readPaymentConfig();
  const method = normalizePaymentMethod(normalizedOrder.payment_method);
  const realMethodEnabled = method === 'alipay' ? Boolean(config.alipay?.enabled) : method === 'wechat' ? Boolean(config.wechat?.enabled) : false;
  const mode: PaymentMode = config.mode === 'production' && realMethodEnabled ? 'production' : 'mock';

  if (mode === 'mock') {
    return {
      order_no: normalizedOrder.order_no,
      status: normalizedOrder.status,
      mode,
      payment_method: 'mock',
      payment_url: `/api/payment/orders/${normalizedOrder.order_no}/pay`,
      message: '当前为模拟支付模式，调用模拟支付接口后立即到账',
    };
  }

  return {
    order_no: normalizedOrder.order_no,
    status: normalizedOrder.status,
    mode,
    payment_method: method,
    payment_url: `/api/payment/${method}/checkout/${normalizedOrder.order_no}`,
    qr_code: `2pix-pay://${method}/${normalizedOrder.order_no}`,
    message: `${getMethodLabel(method)}真实支付下单入口已预留，等待接入官方 SDK`,
  };
}

export function completeRechargeOrder(orderNo: string, source: string, raw?: unknown) {
  const foundOrder = getOrderByNo(orderNo);
  const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;
  if (!order) {
    return { success: false as const, status: 404, error: '订单不存在' };
  }

  if (order.status === 'paid') {
    return {
      success: true as const,
      alreadyPaid: true,
      order,
      message: '订单已支付，忽略重复通知',
    };
  }

  if (order.status !== 'pending') {
    return { success: false as const, status: 400, error: '当前订单状态不能支付' };
  }

  const callbackAmount = extractCallbackAmount(raw);
  const amountCheck = validateCallbackAmount(order, callbackAmount);
  if (!amountCheck.valid) {
    logPaymentCallback({
      orderNo,
      method: order.payment_method,
      amount: callbackAmount,
      verificationStatus: 'amount_failed',
      processStatus: 'rejected',
      message: amountCheck.reason,
      raw,
    });
    return { success: false as const, status: 400, error: amountCheck.reason };
  }

  const user = db.prepare('SELECT id, balance FROM users WHERE id = ?').get(order.user_id) as { id: number; balance: number } | undefined;
  if (!user) {
    return { success: false as const, status: 404, error: '用户不存在' };
  }

  const balanceAfter = user.balance + order.tokens;

  db.prepare('BEGIN').run();
  try {
    db.prepare(`
      UPDATE orders
      SET status = 'paid', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(order.id);
    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceAfter, user.id);
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
      VALUES (?, 'recharge', ?, ?, ?, ?, ?)
    `).run(
      user.id,
      order.tokens,
      user.balance,
      balanceAfter,
      `${getMethodLabel(order.payment_method)}充值 ¥${order.amount}`,
      order.order_no
    );
    db.prepare(`
      INSERT INTO operation_logs (user_id, username, action, module, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      'system',
      'payment_completed',
      'payment',
      source,
      'payment-callback',
      JSON.stringify({ orderNo, source, raw })
    );

    createNotification({
      userId: user.id,
      type: 'recharge',
      title: '充值成功',
      content: `订单 ${order.order_no} 已支付成功，${order.tokens.toLocaleString()} 积分已到账。`,
      relatedType: 'order',
      relatedId: order.order_no,
    });

    // 邀请返佣
    const inviteRecord = db.prepare(`
      SELECT i.id, i.inviter_id, u.balance as inviter_balance
      FROM invites i
      JOIN users u ON i.inviter_id = u.id
      WHERE i.invitee_id = ?
    `).get(user.id) as { id: number; inviter_id: number; inviter_balance: number } | undefined;

    if (inviteRecord) {
      const systemConfig = getSystemConfig();
      const rewardPercent = systemConfig.inviteRewardPercent;
      if (rewardPercent > 0) {
        const rewardAmount = Math.floor(order.tokens * rewardPercent / 100);
        if (rewardAmount > 0) {
          const inviterBalanceAfter = inviteRecord.inviter_balance + rewardAmount;
          db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(inviterBalanceAfter, inviteRecord.inviter_id);
          db.prepare(`
            INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
            VALUES (?, 'invite_reward', ?, ?, ?, ?, ?)
          `).run(
            inviteRecord.inviter_id,
            rewardAmount,
            inviteRecord.inviter_balance,
            inviterBalanceAfter,
            `邀请返佣：用户 ${user.id} 充值获得 ${rewardAmount} 积分`,
            order.order_no
          );
          db.prepare('UPDATE invites SET reward_amount = reward_amount + ? WHERE id = ?').run(rewardAmount, inviteRecord.id);
          createNotification({
            userId: inviteRecord.inviter_id,
            type: 'invite_reward',
            title: '邀请返佣到账',
            content: `你邀请的用户完成充值，获得 ${rewardAmount.toLocaleString()} 积分返佣。`,
            relatedType: 'order',
            relatedId: order.order_no,
          });
        }
      }
    }

    db.prepare('COMMIT').run();
  } catch (error) {
    db.prepare('ROLLBACK').run();
    throw error;
  }

  return {
    success: true as const,
    alreadyPaid: false,
    order: { ...order, status: 'paid' },
    balance_before: user.balance,
    balance_after: balanceAfter,
    message: '支付成功，积分已到账',
  };
}

export function verifyPaymentCallback(method: string, payload: unknown) {
  const config = readPaymentConfig();
  if (config.mode === 'mock') {
    return { valid: true, reason: '模拟模式跳过签名校验' };
  }

  if (method === 'alipay' && !config.alipay?.enabled) {
    return { valid: false, reason: '支付宝未启用' };
  }
  if (method === 'wechat' && !config.wechat?.enabled) {
    return { valid: false, reason: '微信支付未启用' };
  }

  return {
    valid: false,
    reason: '真实支付签名校验尚未接入，请接入官方 SDK 后启用 production 模式',
    payload,
  };
}
