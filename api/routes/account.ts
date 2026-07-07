import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { authMiddleware, comparePassword, generateOrderNo, getClientIp, logOperation } from '../utils/auth.js';
import { completeRechargeOrder, createPaymentSession, getOrderForUser, type RechargeOrder } from '../services/paymentService.js';
import { getSystemConfig } from '../utils/systemConfig.js';
import { createNotification } from '../services/notificationService.js';
import apiKeyRoutes from './apiKeys.js';

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /account/balance:
 *   get:
 *     tags: [账户]
 *     summary: 查询用户余额
 *     security: [bearerAuth]
 *     responses:
 *       200:
 *         description: 返回余额和积分信息
 */

/**
 * @openapi
 * /account/invites:
 *   get:
 *     tags: [账户]
 *     summary: 获取邀请记录
 *     security: [bearerAuth]
 *     responses:
 *       200:
 *         description: 返回邀请码、邀请人数、奖励记录
 */

/**
 * @openapi
 * /account/checkin:
 *   post:
 *     tags: [账户]
 *     summary: 每日签到
 *     security: [bearerAuth]
 *     responses:
 *       200:
 *         description: 签到成功，返回奖励积分
 */

router.use('/api-keys', apiKeyRoutes);

router.get('/balance', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = db.prepare('SELECT id, username, email, nickname, avatar, status, balance FROM users WHERE id = ?').get(req.user?.id);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get account balance error:', error);
    res.status(500).json({ success: false, error: '获取账户余额失败' });
  }
});

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 0;
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as { balance: number } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const monthlyConsumption = db.prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total
      FROM transactions
      WHERE user_id = ? AND amount < 0 AND STRFTIME('%Y-%m', created_at) = STRFTIME('%Y-%m', 'now', 'localtime')
    `).get(userId) as { total: number };

    const monthlyRecharge = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as amount, COALESCE(SUM(tokens), 0) as tokens
      FROM orders
      WHERE user_id = ? AND status = 'paid' AND STRFTIME('%Y-%m', payment_time) = STRFTIME('%Y-%m', 'now', 'localtime')
    `).get(userId) as { amount: number; tokens: number };

    const workStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as image,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as video,
        SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) as audio
      FROM works
      WHERE user_id = ?
    `).get(userId) as { total: number; image: number | null; video: number | null; audio: number | null };

    const usageStats = db.prepare(`
      SELECT COUNT(*) as total_calls, COALESCE(SUM(cost), 0) as total_cost
      FROM token_usage
      WHERE user_id = ? AND status IN ('completed', 'charged')
    `).get(userId) as { total_calls: number; total_cost: number };

    const apiKeyStats = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled
      FROM api_keys
      WHERE user_id = ?
    `).get(userId) as { total: number; enabled: number | null };

    const inviteStats = db.prepare(`
      SELECT COUNT(*) as invite_count, COALESCE(SUM(reward_amount), 0) as total_reward
      FROM invites
      WHERE inviter_id = ?
    `).get(userId) as { invite_count: number; total_reward: number };

    const checkinStats = db.prepare(`
      SELECT COALESCE(MAX(streak_days), 0) as max_streak, COALESCE(SUM(reward), 0) as total_reward
      FROM user_checkins
      WHERE user_id = ?
    `).get(userId) as { max_streak: number; total_reward: number };

    const trend = Array.from({ length: 7 }, (_, index) => {
      const offset = 6 - index;
      const date = db.prepare(`SELECT DATE('now', 'localtime', ?) as date`).get(`-${offset} day`) as { date: string };
      const consumption = db.prepare(`
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions
        WHERE user_id = ? AND amount < 0 AND DATE(created_at, 'localtime') = ?
      `).get(userId, date.date) as { total: number };
      const recharge = db.prepare(`
        SELECT COALESCE(SUM(tokens), 0) as total
        FROM orders
        WHERE user_id = ? AND status = 'paid' AND DATE(payment_time, 'localtime') = ?
      `).get(userId, date.date) as { total: number };
      const works = db.prepare(`
        SELECT COUNT(*) as total
        FROM works
        WHERE user_id = ? AND DATE(created_at, 'localtime') = ?
      `).get(userId, date.date) as { total: number };
      const calls = db.prepare(`
        SELECT COUNT(*) as total
        FROM token_usage
        WHERE user_id = ? AND DATE(created_at, 'localtime') = ?
      `).get(userId, date.date) as { total: number };

      return {
        date: date.date,
        consumption: consumption.total,
        recharge: recharge.total,
        works: works.total,
        calls: calls.total,
      };
    });

    res.json({
      success: true,
      data: {
        balance: user.balance,
        monthlyConsumption: monthlyConsumption.total,
        monthlyRechargeAmount: monthlyRecharge.amount,
        monthlyRechargeTokens: monthlyRecharge.tokens,
        totalWorks: workStats.total,
        worksByType: {
          image: workStats.image || 0,
          video: workStats.video || 0,
          audio: workStats.audio || 0,
        },
        totalCalls: usageStats.total_calls,
        totalUsageCost: usageStats.total_cost,
        apiKeys: {
          total: apiKeyStats.total,
          enabled: apiKeyStats.enabled || 0,
        },
        invites: {
          count: inviteStats.invite_count,
          reward: inviteStats.total_reward,
        },
        checkins: {
          maxStreak: checkinStats.max_streak,
          totalReward: checkinStats.total_reward,
        },
        trend,
      },
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ success: false, error: '获取账户统计失败' });
  }
});

router.get('/checkin/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const dates = db.prepare("SELECT DATE('now', 'localtime') as today").get() as { today: string };
    const today = dates.today;
    const reward = getSystemConfig().dailyCheckInBonus;
    const todayRecord = db.prepare('SELECT id, reward, streak_days FROM user_checkins WHERE user_id = ? AND checkin_date = ?').get(req.user?.id, today) as { id: number; reward: number; streak_days: number } | undefined;
    const latestRecord = db.prepare('SELECT checkin_date, streak_days FROM user_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1').get(req.user?.id) as { checkin_date: string; streak_days: number } | undefined;

    res.json({
      success: true,
      data: {
        today,
        checkedIn: !!todayRecord,
        reward,
        todayReward: todayRecord?.reward || 0,
        streakDays: todayRecord?.streak_days || latestRecord?.streak_days || 0,
        lastCheckInDate: latestRecord?.checkin_date || null,
      },
    });
  } catch (error) {
    console.error('Get checkin status error:', error);
    res.status(500).json({ success: false, error: '获取签到状态失败' });
  }
});

router.post('/checkin', async (req: Request, res: Response): Promise<void> => {
  try {
    const dates = db.prepare("SELECT DATE('now', 'localtime') as today, DATE('now', 'localtime', '-1 day') as yesterday").get() as { today: string; yesterday: string };
    const reward = getSystemConfig().dailyCheckInBonus;
    const existing = db.prepare('SELECT id FROM user_checkins WHERE user_id = ? AND checkin_date = ?').get(req.user?.id, dates.today);
    if (existing) {
      res.status(400).json({ success: false, error: '今天已经签到过了' });
      return;
    }

    const user = db.prepare('SELECT id, username, balance, status FROM users WHERE id = ?').get(req.user?.id) as { id: number; username: string; balance: number; status: string } | undefined;
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }
    if (user.status !== 'active') {
      res.status(403).json({ success: false, error: '账户已被禁用' });
      return;
    }

    const yesterdayRecord = db.prepare('SELECT streak_days FROM user_checkins WHERE user_id = ? AND checkin_date = ?').get(user.id, dates.yesterday) as { streak_days: number } | undefined;
    const streakDays = yesterdayRecord ? yesterdayRecord.streak_days + 1 : 1;
    const balanceAfter = Number(user.balance) + reward;

    db.prepare('BEGIN').run();
    try {
      db.prepare(`
        INSERT INTO user_checkins (user_id, checkin_date, reward, streak_days)
        VALUES (?, ?, ?, ?)
      `).run(user.id, dates.today, reward, streakDays);

      db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceAfter, user.id);

      if (reward > 0) {
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
          VALUES (?, 'reward', ?, ?, ?, ?, ?)
        `).run(user.id, reward, user.balance, balanceAfter, `每日签到奖励，连续 ${streakDays} 天`, `checkin-${dates.today}`);
        createNotification({
          userId: user.id,
          type: 'reward',
          title: '签到奖励到账',
          content: `今日签到成功，获得 ${reward.toLocaleString()} 积分，已连续签到 ${streakDays} 天。`,
          relatedType: 'checkin',
          relatedId: dates.today,
        });
      }

      db.prepare('COMMIT').run();
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }

    logOperation(req.user?.id, req.user?.username, 'daily_checkin', 'account', getClientIp(req), req.headers['user-agent'] || '', {
      checkinDate: dates.today,
      reward,
      streakDays,
      balanceBefore: user.balance,
      balanceAfter,
    });

    res.json({
      success: true,
      message: '签到成功',
      data: {
        checkedIn: true,
        reward,
        streakDays,
        balance_before: user.balance,
        balance_after: balanceAfter,
      },
    });
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ success: false, error: '签到失败' });
  }
});

router.patch('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { nickname, phone, avatar } = req.body;
    const normalizedNickname = String(nickname || '').trim();
    const normalizedPhone = String(phone || '').trim();
    const normalizedAvatar = String(avatar || '').trim();

    if (normalizedNickname && (normalizedNickname.length < 2 || normalizedNickname.length > 30)) {
      res.status(400).json({ success: false, error: '昵称长度应在 2-30 个字符之间' });
      return;
    }
    if (normalizedPhone && !/^1[3-9]\d{9}$/.test(normalizedPhone)) {
      res.status(400).json({ success: false, error: '手机号格式不正确' });
      return;
    }
    if (normalizedAvatar && !/^https?:\/\/.+/i.test(normalizedAvatar)) {
      res.status(400).json({ success: false, error: '头像 URL 必须以 http:// 或 https:// 开头' });
      return;
    }

    if (normalizedPhone) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(normalizedPhone, req.user?.id) as { id: number } | undefined;
      if (existing) {
        res.status(400).json({ success: false, error: '该手机号已被其他账户绑定' });
        return;
      }
    }

    const before = db.prepare('SELECT id, username, email, phone, nickname, avatar, status, balance FROM users WHERE id = ?').get(req.user?.id) as Record<string, unknown> | undefined;
    if (!before) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    db.prepare(`
      UPDATE users
      SET nickname = ?, phone = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      normalizedNickname || null,
      normalizedPhone || null,
      normalizedAvatar || null,
      req.user?.id
    );

    const after = db.prepare('SELECT id, username, email, phone, nickname, avatar, status, balance FROM users WHERE id = ?').get(req.user?.id);

    logOperation(req.user?.id, req.user?.username, 'update_profile', 'account', getClientIp(req), req.headers['user-agent'] || '', {
      before: {
        nickname: before.nickname,
        phone: before.phone,
        avatar: before.avatar,
      },
      after: {
        nickname: normalizedNickname || null,
        phone: normalizedPhone || null,
        avatar: normalizedAvatar || null,
      },
    });

    res.json({ success: true, message: '资料已保存', data: after });
  } catch (error) {
    console.error('Update account profile error:', error);
    res.status(500).json({ success: false, error: '保存资料失败' });
  }
});

router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as string || '';
    const offset = (page - 1) * pageSize;
    const params: (string | number)[] = [req.user?.id || 0];
    let whereClause = 'WHERE user_id = ?';

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM transactions ${whereClause}`).get(...params) as { total: number };
    const list = db.prepare(`
      SELECT id, type, amount, balance_before, balance_after, description, related_id, created_at
      FROM transactions
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    res.json({
      success: true,
      data: {
        list,
        total: countResult.total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Get account transactions error:', error);
    res.status(500).json({ success: false, error: '获取额度流水失败' });
  }
});

router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;

    const countResult = db.prepare('SELECT COUNT(*) as total FROM orders WHERE user_id = ?').get(req.user?.id) as { total: number };
    const list = db.prepare(`
      SELECT id, order_no, amount, tokens, status, payment_method, payment_time, expires_at, closed_at, close_reason, created_at, updated_at
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(req.user?.id, pageSize, offset);

    res.json({
      success: true,
      data: {
        list,
        total: countResult.total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Get account orders error:', error);
    res.status(500).json({ success: false, error: '获取充值订单失败' });
  }
});

router.get('/security-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = db.prepare(`
      SELECT id, action, ip_address, user_agent, details, created_at
      FROM operation_logs
      WHERE user_id = ? AND module = 'auth'
      ORDER BY id DESC
      LIMIT 20
    `).all(req.user?.id);

    const sessions = db.prepare(`
      SELECT id, ip_address, user_agent, expires_at, created_at
      FROM sessions
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 10
    `).all(req.user?.id);

    res.json({
      success: true,
      data: {
        logs,
        sessions,
      },
    });
  } catch (error) {
    console.error('Get account security history error:', error);
    res.status(500).json({ success: false, error: '获取安全记录失败' });
  }
});

router.post('/deactivate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { password, confirmText } = req.body;
    if (confirmText !== '注销账户') {
      res.status(400).json({ success: false, error: '请输入“注销账户”确认操作' });
      return;
    }
    if (!password) {
      res.status(400).json({ success: false, error: '请输入当前密码' });
      return;
    }

    const user = db.prepare('SELECT id, username, password_hash FROM users WHERE id = ?').get(req.user?.id) as { id: number; username: string; password_hash: string } | undefined;
    if (!user || !comparePassword(password, user.password_hash)) {
      res.status(400).json({ success: false, error: '当前密码不正确' });
      return;
    }

    db.prepare("UPDATE users SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user?.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user?.id);
    logOperation(req.user?.id, req.user?.username, 'deactivate_account', 'account', getClientIp(req), req.headers['user-agent'] || '', { confirmText });

    res.json({ success: true, message: '账户已注销' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ success: false, error: '注销账户失败' });
  }
});

router.post('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, tokens, payment_method } = req.body;
    const orderAmount = Number(amount);
    const orderTokens = Number(tokens);

    if (!orderAmount || orderAmount <= 0 || !orderTokens || orderTokens <= 0) {
      res.status(400).json({ success: false, error: '充值金额和积分数量必须大于0' });
      return;
    }

    const orderNo = generateOrderNo();
    const expireMinutes = getSystemConfig().orderExpireMinutes;
    db.prepare(`
      INSERT INTO orders (order_no, user_id, amount, tokens, status, payment_method, expires_at)
      VALUES (?, ?, ?, ?, 'pending', ?, DATETIME('now', ?))
    `).run(orderNo, req.user?.id, orderAmount, orderTokens, payment_method || 'mock', `+${expireMinutes} minutes`);

    const order = getOrderForUser(orderNo, req.user?.id || 0) as RechargeOrder;

    res.status(201).json({
      success: true,
      message: '订单已创建',
      data: {
        order_no: orderNo,
        amount: orderAmount,
        tokens: orderTokens,
        status: 'pending',
        payment_method: payment_method || 'mock',
        payment: createPaymentSession(order),
      },
    });
  } catch (error) {
    console.error('Create account order error:', error);
    res.status(500).json({ success: false, error: '创建充值订单失败' });
  }
});

router.post('/orders/:orderNo/mock-pay', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNo } = req.params;
    const order = getOrderForUser(orderNo, req.user?.id || 0);

    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' });
      return;
    }

    const result = completeRechargeOrder(orderNo, 'account-mock-pay', { userId: req.user?.id });
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
    console.error('Mock pay order error:', error);
    res.status(500).json({ success: false, error: '模拟支付失败' });
  }
});

router.get('/invites', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = db.prepare(`
      SELECT COUNT(*) as invite_count, COALESCE(SUM(reward_amount), 0) as total_reward
      FROM invites
      WHERE inviter_id = ?
    `).get(req.user?.id) as { invite_count: number; total_reward: number };

    const list = db.prepare(`
      SELECT i.id, i.invitee_id, i.invite_code, i.reward_amount, i.created_at,
             u.username as invitee_username, u.nickname as invitee_nickname
      FROM invites i
      JOIN users u ON i.invitee_id = u.id
      WHERE i.inviter_id = ?
      ORDER BY i.id DESC
      LIMIT 50
    `).all(req.user?.id) as Array<{
      id: number;
      invitee_id: number;
      invite_code: string;
      reward_amount: number;
      created_at: string;
      invitee_username: string;
      invitee_nickname: string | null;
    }>;

    res.json({
      success: true,
      data: {
        inviteCode: req.user?.username,
        inviteCount: stats.invite_count,
        totalReward: stats.total_reward,
        list: list.map((item) => ({
          id: item.id,
          inviteeId: item.invitee_id,
          inviteeName: item.invitee_nickname || item.invitee_username,
          rewardAmount: item.reward_amount,
          createdAt: item.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ success: false, error: '获取邀请记录失败' });
  }
});

// ========== 头像上传（base64 方式） ==========
router.post('/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { avatar } = req.body;
    if (!avatar || typeof avatar !== 'string') {
      res.status(400).json({ success: false, error: '无效的头像数据' });
      return;
    }

    // 限制头像大小（base64 约 500KB 以内）
    if (avatar.length > 700000) {
      res.status(400).json({ success: false, error: '头像文件过大，请选择 500KB 以内的图片' });
      return;
    }

    // 验证 base64 格式
    const dataUrlMatch = avatar.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
    if (!dataUrlMatch) {
      res.status(400).json({ success: false, error: '仅支持 PNG、JPG、GIF、WebP 格式' });
      return;
    }

    // 保存为文件到 data/avatars 目录
    const fs = await import('fs');
    const path = await import('path');
    const { dataDir } = await import('../db/index.js');
    const avatarDir = path.join(dataDir, 'avatars');

    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    // 生成文件名
    const ext = dataUrlMatch[1] === 'jpeg' || dataUrlMatch[1] === 'jpg' ? 'jpg' : dataUrlMatch[1];
    const filename = `avatar_${userId}_${Date.now()}.${ext}`;
    const filepath = path.join(avatarDir, filename);

    // 提取纯 base64 数据并写入文件
    const base64Data = avatar.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

    // 删除旧头像文件
    const oldUser = db.prepare('SELECT avatar FROM users WHERE id = ?').get(userId) as { avatar: string | null } | undefined;
    if (oldUser?.avatar && oldUser.avatar.startsWith('/api/account/avatar/')) {
      const oldFilename = oldUser.avatar.split('/').pop();
      if (oldFilename) {
        const oldPath = path.join(avatarDir, oldFilename);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
        }
      }
    }

    // 更新数据库
    const avatarUrl = `/api/account/avatar/${filename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, userId);

    logOperation(userId, req.user?.username, 'update_avatar', 'account', getClientIp(req), req.headers['user-agent'] || '', { filename });

    res.json({ success: true, data: { avatar: avatarUrl } });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ success: false, error: '头像更新失败' });
  }
});

// 头像文件访问
router.get('/avatar/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ success: false, error: '无效的文件名' });
      return;
    }

    const fs = await import('fs');
    const path = await import('path');
    const { dataDir } = await import('../db/index.js');
    const filepath = path.join(dataDir, 'avatars', filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ success: false, error: '头像不存在' });
      return;
    }

    // 设置缓存（头像不常变化）
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(filepath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: '获取头像失败' });
  }
});

export default router;
