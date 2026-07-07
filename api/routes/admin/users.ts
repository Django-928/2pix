import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, requirePermission, hashPassword, getClientIp, logOperation, validateEmail } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('user:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';
    const status = req.query.status as string || '';

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) {
      whereClause += ' AND u.role_id = ?';
      params.push(parseInt(role));
    }
    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`
    ).get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const users = db.prepare(`
      SELECT u.id, u.username, u.email, u.phone, u.nickname, u.avatar,
             u.role_id, u.status, u.balance, u.total_tokens, u.used_tokens,
             u.last_login_at, u.last_login_ip, u.created_at, u.updated_at,
             r.name as role_name,
             COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE user_id = u.id AND amount < 0), 0) as total_spent,
             COALESCE((SELECT COUNT(*) FROM works WHERE user_id = u.id), 0) as works_count,
             COALESCE((SELECT COUNT(*) FROM api_keys WHERE user_id = u.id AND enabled = 1), 0) as enabled_api_keys,
             COALESCE((SELECT count FROM login_failures WHERE user_id = u.id), 0) as login_failures
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        list: users,
        total: countResult.total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

router.get('/:id', requirePermission('user:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.phone, u.nickname, u.avatar,
             u.role_id, u.status, u.balance, u.total_tokens, u.used_tokens,
             u.preferences, u.last_login_at, u.last_login_ip, u.created_at, u.updated_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(id) as { id: number; username: string; status: string } | undefined;

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const transactions = db.prepare(`
      SELECT id, type, amount, balance_before, balance_after, description, related_id, created_at
      FROM transactions
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 20
    `).all(id);

    const usage = db.prepare(`
      SELECT id, model, category, cost, task_id, status, created_at
      FROM token_usage
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 20
    `).all(id);

    const orders = db.prepare(`
      SELECT id, order_no, amount, tokens, status, payment_method, payment_time, created_at, updated_at
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 20
    `).all(id);

    const profile = {
      totalSpent: (db.prepare('SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND amount < 0').get(id) as { total: number }).total,
      totalRecharge: (db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE user_id = ? AND status = 'paid'").get(id) as { total: number }).total,
      totalRechargeTokens: (db.prepare("SELECT COALESCE(SUM(tokens), 0) as total FROM orders WHERE user_id = ? AND status = 'paid'").get(id) as { total: number }).total,
      totalCalls: (db.prepare('SELECT COUNT(*) as count FROM token_usage WHERE user_id = ?').get(id) as { count: number }).count,
      totalWorks: (db.prepare('SELECT COUNT(*) as count FROM works WHERE user_id = ?').get(id) as { count: number }).count,
      apiKeys: (db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled FROM api_keys WHERE user_id = ?').get(id) as { total: number; enabled: number | null }),
      invites: (db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(reward_amount), 0) as reward FROM invites WHERE inviter_id = ?').get(id) as { count: number; reward: number }),
      checkins: (db.prepare('SELECT COUNT(*) as days, COALESCE(MAX(streak_days), 0) as max_streak, COALESCE(SUM(reward), 0) as reward FROM user_checkins WHERE user_id = ?').get(id) as { days: number; max_streak: number; reward: number }),
      worksByType: (db.prepare(`
        SELECT
          SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as image,
          SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as video,
          SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) as audio
        FROM works WHERE user_id = ?
      `).get(id) as { image: number | null; video: number | null; audio: number | null }),
    };

    const loginFailure = db.prepare('SELECT count, last_attempt, locked_until FROM login_failures WHERE user_id = ?').get(id) as { count: number; last_attempt: string | null; locked_until: string | null } | undefined;
    const recentIps = db.prepare(`
      SELECT ip_address, COUNT(*) as count, MAX(created_at) as last_seen
      FROM sessions
      WHERE user_id = ?
      GROUP BY ip_address
      ORDER BY last_seen DESC
      LIMIT 5
    `).all(id);
    const statusLogs = db.prepare(`
      SELECT action, details, created_at, username
      FROM operation_logs
      WHERE module = 'user' AND details LIKE ?
      ORDER BY id DESC
      LIMIT 10
    `).all(`%"targetUserId":${Number(id)}%`);
    const riskScore =
      (loginFailure?.count || 0) * 10 +
      ((profile.totalSpent > 50000 && profile.totalRecharge === 0) ? 30 : 0) +
      (user.status !== 'active' ? 20 : 0);

    const risk = {
      level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
      score: Math.min(100, riskScore),
      loginFailure: loginFailure || { count: 0, last_attempt: null, locked_until: null },
      recentIps,
      statusLogs,
    };

    res.json({ success: true, data: { user, transactions, usage, orders, profile, risk } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

router.post('/:id/adjust-balance', requirePermission('billing:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const adjustAmount = Number(amount);

    if (!adjustAmount || adjustAmount === 0) {
      res.status(400).json({ success: false, error: '调账金额不能为0' });
      return;
    }

    if (!reason || String(reason).trim().length < 2) {
      res.status(400).json({ success: false, error: '请填写调账原因' });
      return;
    }

    const user = db.prepare('SELECT id, username, balance FROM users WHERE id = ?').get(id) as { id: number; username: string; balance: number } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const newBalance = user.balance + adjustAmount;
    if (newBalance < 0) {
      res.status(400).json({ success: false, error: '扣减后余额不能小于0' });
      return;
    }

    const txType = adjustAmount > 0 ? 'admin_adjust_add' : 'admin_adjust_subtract';

    db.prepare('BEGIN').run();
    try {
      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBalance, user.id);
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, txType, adjustAmount, user.balance, newBalance, reason);
      db.prepare('COMMIT').run();
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }

    logOperation(
      req.user?.id,
      req.user?.username,
      'adjust_balance',
      'user',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { targetUserId: user.id, targetUsername: user.username, amount: adjustAmount, reason }
    );

    res.json({
      success: true,
      message: '调账成功',
      data: {
        user_id: user.id,
        balance_before: user.balance,
        balance_after: newBalance,
      },
    });
  } catch (error) {
    console.error('Adjust balance error:', error);
    res.status(500).json({ success: false, error: '调账失败' });
  }
});

router.post('/', requirePermission('user:create'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, phone, password, nickname, role_id, balance, status } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: '用户名、邮箱和密码不能为空' });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ success: false, error: '邮箱格式不正确' });
      return;
    }

    const existing = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username, email);

    if (existing) {
      res.status(400).json({ success: false, error: '用户名或邮箱已存在' });
      return;
    }

    const passwordHash = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (username, email, phone, password_hash, nickname, role_id, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      email,
      phone || null,
      passwordHash,
      nickname || username,
      role_id || null,
      balance || 0,
      status || 'active'
    );

    const userId = result.lastInsertRowid as number;

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
      VALUES (?, 'admin_add', 0, 0, ?, '管理员创建用户')
    `).run(userId, balance || 0);

    logOperation(
      req.user?.id,
      req.user?.username,
      'create_user',
      'user',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { targetUserId: userId, targetUsername: username }
    );

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: { id: userId },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: '创建用户失败' });
  }
});

router.put('/:id', requirePermission('user:edit'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, phone, nickname, role_id, status, password, balance } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (email !== undefined) {
      if (!validateEmail(email)) {
        res.status(400).json({ success: false, error: '邮箱格式不正确' });
        return;
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existing) {
        res.status(400).json({ success: false, error: '邮箱已被使用' });
        return;
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone || null);
    }
    if (nickname !== undefined) {
      updateFields.push('nickname = ?');
      updateValues.push(nickname);
    }
    if (role_id !== undefined) {
      updateFields.push('role_id = ?');
      updateValues.push(role_id || null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (password) {
      updateFields.push('password_hash = ?');
      updateValues.push(hashPassword(password));
    }
    if (balance !== undefined) {
      const oldBalance = (user as { balance: number }).balance;
      const newBalance = balance as number;
      const diff = newBalance - oldBalance;
      updateFields.push('balance = ?');
      updateValues.push(newBalance);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
        VALUES (?, ?, ?, ?, ?, '管理员调整余额')
      `).run(id, diff > 0 ? 'recharge' : 'deduct', diff, oldBalance, newBalance);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(parseInt(id));

    db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_user',
      'user',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { targetUserId: parseInt(id), updatedFields: updateFields }
    );

    res.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: '更新用户失败' });
  }
});

router.delete('/:id', requirePermission('user:delete'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    if (parseInt(id) === req.user?.id) {
      res.status(400).json({ success: false, error: '不能删除自己的账户' });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    logOperation(
      req.user?.id,
      req.user?.username,
      'delete_user',
      'user',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { targetUserId: parseInt(id), targetUsername: (user as { username: string }).username }
    );

    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

router.patch('/:id/status', requirePermission('user:edit'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'disabled', 'banned'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }

    if (status !== 'active' && (!reason || String(reason).trim().length < 2)) {
      res.status(400).json({ success: false, error: '禁用或封禁用户时必须填写原因' });
      return;
    }

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    logOperation(
      req.user?.id,
      req.user?.username,
      'update_user_status',
      'user',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { targetUserId: parseInt(id), targetUsername: user.username, status, reason: reason || '恢复正常' }
    );

    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, error: '更新状态失败' });
  }
});

export default router;
