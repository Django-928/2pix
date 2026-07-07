import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, requirePermission, getClientIp, logOperation, generateOrderNo } from '../../utils/auth.js';
import { getOrderByNo, markExpiredIfNeeded } from '../../services/paymentService.js';

const router = Router();

router.use(authMiddleware);

router.get('/prices', requirePermission('price:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const prices = db.prepare('SELECT * FROM token_prices ORDER BY category, model').all();
    res.json({ success: true, data: prices });
  } catch (error) {
    console.error('Get prices error:', error);
    res.status(500).json({ success: false, error: '获取价格列表失败' });
  }
});

router.put('/prices/:id', requirePermission('price:edit'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { input_price, output_price, cost_multiplier, is_active } = req.body;

    const price = db.prepare('SELECT * FROM token_prices WHERE id = ?').get(id);
    if (!price) {
      res.status(404).json({ success: false, error: '价格配置不存在' });
      return;
    }

    const updateFields: string[] = [];
    const updateValues: (number | number | null)[] = [];

    if (input_price !== undefined) {
      updateFields.push('input_price = ?');
      updateValues.push(input_price);
    }
    if (output_price !== undefined) {
      updateFields.push('output_price = ?');
      updateValues.push(output_price);
    }
    if (cost_multiplier !== undefined) {
      updateFields.push('cost_multiplier = ?');
      updateValues.push(cost_multiplier);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(parseInt(id));

    db.prepare(`UPDATE token_prices SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_price',
      'billing',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { priceId: parseInt(id) }
    );

    res.json({ success: true, message: '价格更新成功' });
  } catch (error) {
    console.error('Update price error:', error);
    res.status(500).json({ success: false, error: '更新价格失败' });
  }
});

router.get('/usage', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string || '';
    const userId = req.query.userId as string || '';
    const model = req.query.model as string || '';
    const category = req.query.category as string || '';
    const status = req.query.status as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR tu.model LIKE ? OR tu.task_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (userId) {
      whereClause += ' AND tu.user_id = ?';
      params.push(parseInt(userId));
    }
    if (model) {
      whereClause += ' AND tu.model = ?';
      params.push(model);
    }
    if (category) {
      whereClause += ' AND tu.category = ?';
      params.push(category);
    }
    if (status) {
      whereClause += ' AND tu.status = ?';
      params.push(status);
    }
    if (startDate) {
      whereClause += ' AND tu.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND tu.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM token_usage tu JOIN users u ON tu.user_id = u.id ${whereClause}`
    ).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const usageList = db.prepare(`
      SELECT tu.*, u.username, u.email
      FROM token_usage tu
      JOIN users u ON tu.user_id = u.id
      ${whereClause}
      ORDER BY tu.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN tu.status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
        SUM(CASE WHEN tu.status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
        SUM(CASE WHEN tu.status = 'refunded' THEN 1 ELSE 0 END) as refunded_calls,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost
      FROM token_usage tu
      JOIN users u ON tu.user_id = u.id
      ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        list: usageList,
        total: countResult.total,
        page,
        pageSize,
        stats,
      },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ success: false, error: '获取用量统计失败' });
  }
});

router.get('/usage/:id', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const usage = db.prepare(`
      SELECT tu.*, u.username, u.email, u.balance, u.status as user_status
      FROM token_usage tu
      JOIN users u ON tu.user_id = u.id
      WHERE tu.id = ?
    `).get(id);

    if (!usage) {
      res.status(404).json({ success: false, error: '模型调用记录不存在' });
      return;
    }

    const taskId = (usage as { task_id?: string }).task_id;
    const transactions = taskId
      ? db.prepare(`
          SELECT id, type, amount, balance_before, balance_after, description, related_id, created_at
          FROM transactions
          WHERE related_id = ?
          ORDER BY id DESC
          LIMIT 10
        `).all(taskId)
      : [];

    res.json({
      success: true,
      data: {
        usage,
        transactions,
      },
    });
  } catch (error) {
    console.error('Get usage detail error:', error);
    res.status(500).json({ success: false, error: '获取模型调用详情失败' });
  }
});

router.get('/transactions', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const userId = req.query.userId as string || '';
    const type = req.query.type as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (userId) {
      whereClause += ' AND t.user_id = ?';
      params.push(parseInt(userId));
    }
    if (type) {
      whereClause += ' AND t.type = ?';
      params.push(type);
    }
    if (startDate) {
      whereClause += ' AND t.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND t.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`
    ).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const transactions = db.prepare(`
      SELECT t.*, u.username, u.email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_expense
      FROM transactions t
      ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        list: transactions,
        total: countResult.total,
        page,
        pageSize,
        stats,
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: '获取交易记录失败' });
  }
});

router.get('/orders', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const method = req.query.method as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ' AND (o.order_no LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    if (method) {
      whereClause += ' AND o.payment_method = ?';
      params.push(method);
    }
    if (startDate) {
      whereClause += ' AND o.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND o.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const countResult = db.prepare(`
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const list = db.prepare(`
      SELECT
        o.id, o.order_no, o.user_id, o.amount, o.tokens, o.status, o.payment_method,
        o.payment_time, o.expires_at, o.closed_at, o.close_reason, o.created_at, o.updated_at,
        u.username, u.email,
        COUNT(pc.id) as callback_count,
        MAX(pc.created_at) as last_callback_at
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN payment_callbacks pc ON o.order_no = pc.order_no
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN o.status = 'expired' THEN 1 ELSE 0 END) as expired_count,
        SUM(CASE WHEN o.status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END) as paid_amount
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        list,
        total: countResult.total,
        page,
        pageSize,
        stats,
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: '获取订单列表失败' });
  }
});

router.get('/orders/:orderNo', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params;
    const foundOrder = getOrderByNo(orderNo);
    const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    const user = db.prepare('SELECT id, username, email, balance, status FROM users WHERE id = ?').get(order.user_id);
    const callbacks = db.prepare(`
      SELECT id, order_no, payment_method, event_type, amount, verification_status, process_status, message, raw_payload, created_at
      FROM payment_callbacks
      WHERE order_no = ?
      ORDER BY id DESC
      LIMIT 20
    `).all(orderNo);
    const transaction = db.prepare(`
      SELECT id, type, amount, balance_before, balance_after, description, created_at
      FROM transactions
      WHERE related_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(orderNo);

    res.json({
      success: true,
      data: {
        order,
        user,
        callbacks,
        transaction,
      },
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ success: false, error: '获取订单详情失败' });
  }
});

router.post('/orders/:orderNo/close', requirePermission('billing:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params;
    const reason = req.body?.reason || '管理员关闭订单';
    const foundOrder = getOrderByNo(orderNo);
    const order = foundOrder ? markExpiredIfNeeded(foundOrder) : undefined;

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }
    if (order.status === 'paid') {
      res.status(400).json({ success: false, error: '已支付订单不能关闭' });
      return;
    }
    if (order.status !== 'pending') {
      res.json({
        success: true,
        message: '订单已关闭或已过期',
        data: { order_no: order.order_no, status: order.status, close_reason: order.close_reason },
      });
      return;
    }

    db.prepare(`
      UPDATE orders
      SET status = 'closed', closed_at = CURRENT_TIMESTAMP, close_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE order_no = ? AND status = 'pending'
    `).run(reason, orderNo);

    logOperation(
      req.user?.id,
      req.user?.username,
      'close_order',
      'billing',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { orderNo, reason }
    );

    res.json({
      success: true,
      message: '订单已关闭',
      data: { order_no: orderNo, status: 'closed', close_reason: reason },
    });
  } catch (error) {
    console.error('Close order error:', error);
    res.status(500).json({ success: false, error: '关闭订单失败' });
  }
});

router.get('/payment-callbacks', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string || '';
    const method = req.query.method as string || '';
    const verificationStatus = req.query.verificationStatus as string || '';
    const processStatus = req.query.processStatus as string || '';
    const startDate = req.query.startDate as string || '';
    const endDate = req.query.endDate as string || '';

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ' AND (pc.order_no LIKE ? OR pc.message LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (method) {
      whereClause += ' AND pc.payment_method = ?';
      params.push(method);
    }
    if (verificationStatus) {
      whereClause += ' AND pc.verification_status = ?';
      params.push(verificationStatus);
    }
    if (processStatus) {
      whereClause += ' AND pc.process_status = ?';
      params.push(processStatus);
    }
    if (startDate) {
      whereClause += ' AND pc.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND pc.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM payment_callbacks pc ${whereClause}`
    ).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const list = db.prepare(`
      SELECT
        pc.id, pc.order_no, pc.payment_method, pc.event_type, pc.amount,
        pc.verification_status, pc.process_status, pc.message, pc.raw_payload, pc.created_at,
        o.user_id, o.amount as order_amount, o.tokens, o.status as order_status,
        u.username, u.email
      FROM payment_callbacks pc
      LEFT JOIN orders o ON pc.order_no = o.order_no
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY pc.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN process_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN process_status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN process_status = 'duplicate_ignored' THEN 1 ELSE 0 END) as duplicate_count
      FROM payment_callbacks pc
      ${whereClause}
    `).get(...params);

    res.json({
      success: true,
      data: {
        list,
        total: countResult.total,
        page,
        pageSize,
        stats,
      },
    });
  } catch (error) {
    console.error('Get payment callbacks error:', error);
    res.status(500).json({ success: false, error: '获取支付回调日志失败' });
  }
});

router.get('/payment-callbacks/:id', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const callback = db.prepare(`
      SELECT
        pc.id, pc.order_no, pc.payment_method, pc.event_type, pc.amount,
        pc.verification_status, pc.process_status, pc.message, pc.raw_payload, pc.created_at,
        o.user_id, o.amount as order_amount, o.tokens, o.status as order_status,
        o.payment_time, o.expires_at, o.closed_at, o.close_reason,
        u.username, u.email
      FROM payment_callbacks pc
      LEFT JOIN orders o ON pc.order_no = o.order_no
      LEFT JOIN users u ON o.user_id = u.id
      WHERE pc.id = ?
    `).get(id);

    if (!callback) {
      res.status(404).json({ success: false, error: '回调日志不存在' });
      return;
    }

    res.json({ success: true, data: callback });
  } catch (error) {
    console.error('Get payment callback detail error:', error);
    res.status(500).json({ success: false, error: '获取支付回调详情失败' });
  }
});

router.post('/recharge', requirePermission('billing:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount) {
      res.status(400).json({ success: false, error: '用户ID和金额不能为空' });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ success: false, error: '充值金额必须大于0' });
      return;
    }

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(user_id);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const oldBalance = (user as { balance: number }).balance;
    const newBalance = oldBalance + amount;

    const orderNo = generateOrderNo();

    db.prepare('BEGIN').run();

    try {
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBalance, user_id);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
        VALUES (?, 'admin_recharge', ?, ?, ?, ?, ?)
      `).run(user_id, amount, oldBalance, newBalance, description || '管理员充值', orderNo);

      db.prepare(`
        INSERT INTO orders (order_no, user_id, amount, tokens, status, payment_method, payment_time)
        VALUES (?, ?, ?, ?, 'completed', 'admin', CURRENT_TIMESTAMP)
      `).run(orderNo, user_id, amount, Math.floor(amount * 1000));

      db.prepare('COMMIT').run();
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }

    logOperation(
      req.user?.id,
      req.user?.username,
      'admin_recharge',
      'billing',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { targetUserId: user_id, amount, orderNo }
    );

    res.json({ success: true, message: '充值成功', data: { order_no: orderNo, new_balance: newBalance } });
  } catch (error) {
    console.error('Recharge error:', error);
    res.status(500).json({ success: false, error: '充值失败' });
  }
});

router.get('/dashboard', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const todayUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')").get() as { count: number };
    const totalRevenue = db.prepare(
      "SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total FROM transactions WHERE type IN ('recharge', 'admin_recharge')"
    ).get() as { total: number };
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type IN ('recharge', 'admin_recharge') AND DATE(created_at) = DATE('now')
    `).get() as { total: number };
    const totalCost = db.prepare(
      "SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total FROM transactions WHERE type IN ('usage', 'consume')"
    ).get() as { total: number };
    const todayCost = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total
      FROM transactions
      WHERE type IN ('usage', 'consume') AND DATE(created_at) = DATE('now')
    `).get() as { total: number };
    const totalBalance = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM users').get() as { total: number };
    const todayCalls = db.prepare("SELECT COUNT(*) as count FROM token_usage WHERE DATE(created_at) = DATE('now')").get() as { count: number };
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as { count: number };
    const paidOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'paid'").get() as { count: number };
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    const todayOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE('now')").get() as { count: number };
    const activeUsers7d = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM sessions
      WHERE created_at >= DATETIME('now', '-7 days')
    `).get() as { count: number };
    const worksStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as image,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as video,
        SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) as audio
      FROM works
    `).get() as { total: number; today: number | null; image: number | null; video: number | null; audio: number | null };
    const apiKeyStats = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled
      FROM api_keys
    `).get() as { total: number; enabled: number | null };
    const inviteStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(reward_amount), 0) as reward
      FROM invites
    `).get() as { count: number; reward: number };
    const abnormalCallbacks = db.prepare(`
      SELECT COUNT(*) as count
      FROM payment_callbacks
      WHERE process_status IN ('rejected', 'failed') OR verification_status IN ('amount_failed', 'signature_failed', 'invalid')
    `).get() as { count: number };

    const dailyStats = db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(CASE WHEN type IN ('recharge', 'admin_recharge') THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type IN ('usage', 'consume') THEN ABS(amount) ELSE 0 END) as expense
      FROM transactions
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `).all();

    const sevenDayTrend = db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT DATE('now', '-6 days')
        UNION ALL
        SELECT DATE(date, '+1 day') FROM dates WHERE date < DATE('now')
      )
      SELECT
        d.date,
        COALESCE(SUM(CASE WHEN t.type IN ('recharge', 'admin_recharge') THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN t.type IN ('usage', 'consume') THEN ABS(t.amount) ELSE 0 END), 0) as expense,
        COALESCE((
          SELECT COUNT(*)
          FROM token_usage tu
          WHERE DATE(tu.created_at) = d.date
        ), 0) as calls,
        COALESCE((
          SELECT COUNT(*)
          FROM users u
          WHERE DATE(u.created_at) = d.date
        ), 0) as users,
        COALESCE((
          SELECT COUNT(*)
          FROM orders o
          WHERE DATE(o.created_at) = d.date
        ), 0) as orders,
        COALESCE((
          SELECT COUNT(*)
          FROM works w
          WHERE DATE(w.created_at) = d.date
        ), 0) as works
      FROM dates d
      LEFT JOIN transactions t ON DATE(t.created_at) = d.date
      GROUP BY d.date
      ORDER BY d.date ASC
    `).all();

    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(cost) as revenue
      FROM token_usage
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY category
      ORDER BY revenue DESC
    `).all();

    const topModels = db.prepare(`
      SELECT model, category, COUNT(*) as calls, COALESCE(SUM(cost), 0) as total_cost
      FROM token_usage
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY model, category
      ORDER BY total_cost DESC, calls DESC
      LIMIT 10
    `).all();

    const topUsers = db.prepare(`
      SELECT u.id, u.username, u.email, COUNT(tu.id) as calls, SUM(tu.cost) as total_cost
      FROM token_usage tu
      JOIN users u ON tu.user_id = u.id
      WHERE tu.created_at >= datetime('now', '-30 days')
      GROUP BY tu.user_id
      ORDER BY total_cost DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        totalRevenue: totalRevenue.total,
        totalCost: totalCost.total,
        totalBalance: totalBalance.total,
        profit: totalRevenue.total - totalCost.total,
        todayUsers: todayUsers.count,
        todayRevenue: todayRevenue.total,
        todayCalls: todayCalls.count,
        todayCost: todayCost.total,
        todayOrders: todayOrders.count,
        totalOrders: totalOrders.count,
        paidOrders: paidOrders.count,
        pendingOrders: pendingOrders.count,
        orderConversionRate: totalOrders.count > 0 ? Number(((paidOrders.count / totalOrders.count) * 100).toFixed(2)) : 0,
        activeUsers7d: activeUsers7d.count,
        totalWorks: worksStats.total,
        todayWorks: worksStats.today || 0,
        worksByType: {
          image: worksStats.image || 0,
          video: worksStats.video || 0,
          audio: worksStats.audio || 0,
        },
        apiKeys: {
          total: apiKeyStats.total,
          enabled: apiKeyStats.enabled || 0,
        },
        invites: {
          count: inviteStats.count,
          reward: inviteStats.reward,
        },
        abnormalCallbacks: abnormalCallbacks.count,
        dailyStats: dailyStats.reverse(),
        sevenDayTrend,
        categoryStats,
        topModels,
        topUsers,
      },
    });
  } catch (error) {
    console.error('Get billing dashboard error:', error);
    res.status(500).json({ success: false, error: '获取计费面板失败' });
  }
});

// ========== 支付对账 ==========
router.get('/reconciliation', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string, 10) || 7));

    // 按日期对账汇总
    const dailyData = db.prepare(`
      SELECT
        DATE(created_at, 'localtime') as date,
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_orders,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_orders,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'paid' THEN tokens ELSE 0 END) as paid_tokens
      FROM orders
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY DATE(created_at, 'localtime')
      ORDER BY date DESC
    `).all() as Array<{
      date: string; total_orders: number; paid_orders: number; pending_orders: number;
      expired_orders: number; closed_orders: number; paid_amount: number; paid_tokens: number;
    }>;

    // 回调统计
    const callbackStats = db.prepare(`
      SELECT
        COUNT(*) as total_callbacks,
        SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN verification_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN process_status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN process_status = 'failed' THEN 1 ELSE 0 END) as process_failed
      FROM payment_callbacks
      WHERE created_at >= datetime('now', '-${days} days')
    `).get() as { total_callbacks: number; verified: number; failed: number; success: number; process_failed: number };

    // 总计
    const totals = dailyData.reduce((acc, d) => ({
      orders: acc.orders + d.total_orders,
      paid: acc.paid + d.paid_orders,
      amount: acc.amount + d.paid_amount,
      tokens: acc.tokens + d.paid_tokens,
    }), { orders: 0, paid: 0, amount: 0, tokens: 0 });

    res.json({
      success: true,
      data: {
        days,
        daily: dailyData,
        callbacks: callbackStats,
        totals,
        paidRate: totals.orders > 0 ? Math.round((totals.paid / totals.orders) * 1000) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('Get reconciliation error:', error);
    res.status(500).json({ success: false, error: '获取对账数据失败' });
  }
});

// ========== 模型成本利润分析 ==========
router.get('/profit-analysis', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string, 10) || 7));

    // 按模型统计：调用次数、总收入（用户扣费）、总成本（API 成本）、毛利
    const modelStats = db.prepare(`
      SELECT
        tu.model,
        tu.category,
        COUNT(*) as total_calls,
        SUM(tu.input_tokens) as total_input_tokens,
        SUM(tu.output_tokens) as total_output_tokens,
        SUM(tu.cost) as total_revenue,
        SUM(CASE WHEN tu.status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
        SUM(CASE WHEN tu.status = 'refunded' THEN 1 ELSE 0 END) as refunded_calls
      FROM token_usage tu
      WHERE tu.created_at >= datetime('now', '-${days} days')
      GROUP BY tu.model, tu.category
      HAVING total_calls > 0
      ORDER BY total_revenue DESC
    `).all() as Array<{
      model: string;
      category: string;
      total_calls: number;
      total_input_tokens: number;
      total_output_tokens: number;
      total_revenue: number;
      failed_calls: number;
      refunded_calls: number;
    }>;

    // 获取价格配置中的成本乘数来估算 API 成本
    const prices = db.prepare('SELECT model, cost_multiplier FROM token_prices').all() as Array<{ model: string; cost_multiplier: number }>;
    const priceMap = new Map(prices.map((p) => [p.model, p.cost_multiplier || 1]));

    const categoryLabels: Record<string, string> = {
      image: '图片', video: '视频', audio: '音频', chat: '对话', embedding: '嵌入',
    };

    const analysis = modelStats.map((m) => {
      const multiplier = priceMap.get(m.model) || 1;
      const estimatedCost = m.total_revenue * multiplier;
      const grossProfit = m.total_revenue - estimatedCost;
      const margin = m.total_revenue > 0 ? (grossProfit / m.total_revenue) * 100 : 0;

      return {
        model: m.model,
        category: categoryLabels[m.category] || m.category,
        totalCalls: m.total_calls,
        inputTokens: m.total_input_tokens,
        outputTokens: m.total_output_tokens,
        revenue: m.total_revenue,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        margin: Math.round(margin * 10) / 10,
        failedCalls: m.failed_calls,
        refundedCalls: m.refunded_calls,
      };
    });

    // 总计
    const totals = analysis.reduce((acc, a) => ({
      calls: acc.calls + a.totalCalls,
      revenue: acc.revenue + a.revenue,
      cost: acc.cost + a.estimatedCost,
      profit: acc.profit + a.grossProfit,
      failed: acc.failed + a.failedCalls,
      refunded: acc.refunded + a.refundedCalls,
    }), { calls: 0, revenue: 0, cost: 0, profit: 0, failed: 0, refunded: 0 });

    res.json({
      success: true,
      data: {
        days,
        models: analysis,
        totals,
        overallMargin: totals.revenue > 0 ? Math.round(((totals.revenue - totals.cost) / totals.revenue) * 1000) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('Get profit analysis error:', error);
    res.status(500).json({ success: false, error: '获取利润分析失败' });
  }
});

export default router;
