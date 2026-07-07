import db from '../db/index.js';

export interface RefundRecord {
  id: number;
  order_id: number;
  order_no: string;
  user_id: number;
  amount: number;
  reason: string | null;
  status: string;
  processed_by: number | null;
  created_at: string;
}

export function refundOrder(options: {
  orderId: number;
  orderNo: string;
  userId: number;
  amount: number;
  reason: string;
  processedBy: number;
}): { refundId: number; balanceAfter: number } {
  const { orderId, orderNo, userId, amount, reason, processedBy } = options;

  db.prepare('BEGIN').run();
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND status = ?').get(orderId, 'paid') as {
      id: number;
      user_id: number;
      amount: number;
      tokens: number;
      status: string;
    } | undefined;

    if (!order) {
      throw new Error('订单不存在或未支付');
    }

    if (order.user_id !== userId) {
      throw new Error('订单与用户不匹配');
    }

    if (amount <= 0 || amount > order.amount) {
      throw new Error('退款金额必须在 0 到订单金额之间');
    }

    const existingRefund = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM refund_records WHERE order_id = ? AND status = ?').get(orderId, 'completed') as { total: number };
    if (Number(existingRefund.total) + amount > order.amount) {
      throw new Error('累计退款金额不能超过订单金额');
    }

    const user = db.prepare('SELECT id, balance FROM users WHERE id = ?').get(userId) as { id: number; balance: number } | undefined;
    if (!user) {
      throw new Error('用户不存在');
    }

    const deductTokens = Math.floor((amount / order.amount) * order.tokens);
    const balanceAfter = Math.max(0, Number(user.balance) - deductTokens);

    const refundResult = db.prepare(`
      INSERT INTO refund_records (order_id, order_no, user_id, amount, reason, status, processed_by)
      VALUES (?, ?, ?, ?, ?, 'completed', ?)
    `).run(orderId, orderNo, userId, amount, reason, processedBy);

    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceAfter, userId);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
      VALUES (?, 'refund', ?, ?, ?, ?, ?)
    `).run(userId, -deductTokens, user.balance, balanceAfter, `订单退款：${orderNo}${reason ? ' - ' + reason : ''}`, `refund-${orderId}`);

    const totalRefunded = Number(existingRefund.total) + amount;
    if (totalRefunded >= order.amount) {
      db.prepare(`
        UPDATE orders SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(orderId);
    }

    db.prepare('COMMIT').run();

    return { refundId: Number(refundResult.lastInsertRowid), balanceAfter };
  } catch (error) {
    db.prepare('ROLLBACK').run();
    throw error;
  }
}

export function listRefunds(filters: {
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { status, keyword, page = 1, pageSize = 20 } = filters;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    where.push('r.status = ?');
    params.push(status);
  }
  if (keyword) {
    where.push('(r.order_no LIKE ? OR r.reason LIKE ? OR u.username LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM refund_records r ${whereSql}`).get(...params) as { total: number };

  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT r.*, u.username, u.nickname, a.username as processed_by_name
    FROM refund_records r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users a ON r.processed_by = a.id
    ${whereSql}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).get(...params, pageSize, offset) as (RefundRecord & { username: string; nickname: string; processed_by_name: string })[];

  return {
    list: rows,
    total: countRow.total,
    page,
    pageSize,
  };
}

export function getRefundsByOrder(orderId: number) {
  return db.prepare(`
    SELECT r.*, u.username, u.nickname
    FROM refund_records r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.order_id = ?
    ORDER BY r.created_at DESC
  `).all(orderId) as (RefundRecord & { username: string; nickname: string })[];
}
