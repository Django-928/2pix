import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  getClientIp,
  logOperation,
  validateEmail,
  checkPasswordStrength,
  authMiddleware,
} from '../utils/auth.js';
import { getSystemConfig } from '../utils/systemConfig.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [认证]
 *     summary: 用户注册
 *     description: 注册新用户，支持邀请码
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: 'testuser' }
 *               email: { type: string, example: 'test@example.com' }
 *               password: { type: string, example: '12345678' }
 *               inviteCode: { type: string, example: 'INVITE123' }
 *     responses:
 *       200:
 *         description: 注册成功，返回用户信息和 Token
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 用户登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: 'admin' }
 *               password: { type: string, example: 'admin123' }
 *     responses:
 *       200:
 *         description: 登录成功，返回 Token
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [认证]
 *     summary: 获取当前用户信息
 *     security: [bearerAuth]
 *     responses:
 *       200:
 *         description: 返回当前登录用户信息
 */

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [认证]
 *     summary: 退出登录
 *     security: [bearerAuth]
 *     responses:
 *       200:
 *         description: 退出成功
 */

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [认证]
 *     summary: 修改密码
 *     security: [bearerAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, example: 'old123' }
 *               newPassword: { type: string, example: 'new456' }
 *     responses:
 *       200:
 *         description: 密码修改成功
 */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: '登录尝试次数过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: '注册次数过多，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, phone, nickname, inviteCode } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: '用户名、邮箱和密码不能为空' });
      return;
    }

    if (username.length < 3 || username.length > 20) {
      res.status(400).json({ success: false, error: '用户名长度应在3-20个字符之间' });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ success: false, error: '邮箱格式不正确' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: '密码长度不能少于6位' });
      return;
    }

    const strength = checkPasswordStrength(password);
    if (strength.score < 2) {
      res.status(400).json({ success: false, error: '密码强度太弱，请使用更复杂的密码' });
      return;
    }

    const existingUser = phone
      ? db.prepare('SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?').get(username, email, phone)
      : db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);

    if (existingUser) {
      res.status(400).json({ success: false, error: '用户名或邮箱已被注册' });
      return;
    }

    const userRole = db.prepare("SELECT id FROM roles WHERE name = 'user'").get() as { id: number } | undefined;
    const passwordHash = hashPassword(password);
    const ip = getClientIp(req);
    const systemConfig = getSystemConfig();
    const welcomeBonus = systemConfig.welcomeBonus;

    const result = db.prepare(`
      INSERT INTO users (username, email, phone, password_hash, nickname, role_id, status, balance)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      username,
      email,
      phone || null,
      passwordHash,
      nickname || username,
      userRole?.id || null,
      welcomeBonus
    );

    const userId = result.lastInsertRowid as number;

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description)
      VALUES (?, 'register', ?, 0, ?, ?)
    `).run(userId, welcomeBonus, welcomeBonus, welcomeBonus > 0 ? `用户注册赠送 ${welcomeBonus} 积分` : '用户注册');

    // 处理邀请码
    let inviterId: number | null = null;
    if (inviteCode) {
      const inviter = db.prepare('SELECT id FROM users WHERE username = ?').get(inviteCode) as { id: number } | undefined;
      if (inviter && inviter.id !== userId) {
        inviterId = inviter.id;
        db.prepare(`
          INSERT INTO invites (inviter_id, invitee_id, invite_code)
          VALUES (?, ?, ?)
        `).run(inviterId, userId, inviteCode);
      }
    }

    const token = generateToken({
      id: userId,
      username,
      email,
      role_id: userRole?.id || null,
      status: 'active',
      balance: welcomeBonus,
    });

    db.prepare(`
      INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, DATETIME('now', '+7 days'))
    `).run(userId, token, ip, req.headers['user-agent'] || '');

    logOperation(userId, username, 'register', 'auth', ip, req.headers['user-agent'] || '', { inviteCode: inviteCode || null, inviterId });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: userId,
          username,
          email,
          phone: phone || null,
          nickname: nickname || username,
          avatar: null,
          role_name: 'user',
          status: 'active',
          balance: welcomeBonus,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' });
  }
});

router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const user = db.prepare(`
      SELECT u.*, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = ? OR u.email = ? OR u.phone = ?
    `).get(username, username, username) as (Record<string, unknown> & { id: number; password_hash: string; status: string }) | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    // 检查账户锁定状态
    const lockInfo = db.prepare('SELECT count, locked_until FROM login_failures WHERE user_id = ?').get(user.id) as { count: number; locked_until: string | null } | undefined;
    if (lockInfo?.locked_until) {
      const lockedUntil = new Date(lockInfo.locked_until).getTime();
      if (lockedUntil > Date.now()) {
        const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
        res.status(403).json({ success: false, error: `登录失败次数过多，请${minutesLeft}分钟后再试` });
        return;
      }
    }

    if (!comparePassword(password, user.password_hash)) {
      const newCount = (lockInfo?.count || 0) + 1;
      const ip = getClientIp(req);
      if (newCount >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const updated = db.prepare('UPDATE login_failures SET count = ?, last_attempt = CURRENT_TIMESTAMP, locked_until = ? WHERE user_id = ?').run(newCount, lockedUntil, user.id);
        if (updated.changes === 0) {
          db.prepare('INSERT INTO login_failures (user_id, count, last_attempt, locked_until) VALUES (?, ?, CURRENT_TIMESTAMP, ?)').run(user.id, newCount, lockedUntil);
        }
        logOperation(user.id, user.username as string, 'account_locked', 'auth', ip, req.headers['user-agent'] || '', { reason: '连续登录失败5次', lockDurationMinutes: 30 });
        res.status(403).json({ success: false, error: '登录失败次数过多，账户已锁定30分钟' });
      } else {
        const updated = db.prepare('UPDATE login_failures SET count = ?, last_attempt = CURRENT_TIMESTAMP, locked_until = NULL WHERE user_id = ?').run(newCount, user.id);
        if (updated.changes === 0) {
          db.prepare('INSERT INTO login_failures (user_id, count, last_attempt) VALUES (?, ?, CURRENT_TIMESTAMP)').run(user.id, newCount);
        }
        logOperation(user.id, user.username as string, 'login_failed', 'auth', ip, req.headers['user-agent'] || '', { failCount: newCount });
        res.status(401).json({ success: false, error: '用户名或密码错误' });
      }
      return;
    }

    // 登录成功：重置失败计数
    db.prepare('DELETE FROM login_failures WHERE user_id = ?').run(user.id);

    if (user.status !== 'active') {
      res.status(403).json({ success: false, error: '账户已被禁用，请联系管理员' });
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username as string,
      email: user.email as string,
      role_id: user.role_id as number | null,
      status: user.status as string,
      balance: user.balance as number,
    });

    const ip = getClientIp(req);
    db.prepare(`
      UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?
    `).run(ip, user.id);

    db.prepare(`
      INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, DATETIME('now', '+7 days'))
    `).run(user.id, token, ip, req.headers['user-agent'] || '');

    logOperation(user.id, user.username as string, 'login', 'auth', ip, req.headers['user-agent'] || '');

    // 查询用户权限列表
    const permissions = db.prepare(`
      SELECT p.name, p.module, p.action, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).all(user.role_id as number | null) as { name: string; module: string; action: string; description: string }[];

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          role_name: user.role_name,
          status: user.status,
          balance: user.balance,
          permissions: permissions.map(p => p.name),
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }

    if (req.user) {
      logOperation(
        req.user.id,
        req.user.username,
        'logout',
        'auth',
        getClientIp(req),
        req.headers['user-agent'] || ''
      );
    }

    res.json({ success: true, message: '退出成功' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: '退出失败' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.phone, u.nickname, u.avatar,
             u.role_id, u.status, u.balance, u.total_tokens, u.used_tokens,
             u.preferences, u.last_login_at, u.created_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(req.user.id);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, error: '旧密码和新密码不能为空' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: '新密码长度不能少于6位' });
      return;
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user?.id) as { password_hash: string } | undefined;

    if (!user || !comparePassword(oldPassword, user.password_hash)) {
      res.status(400).json({ success: false, error: '旧密码不正确' });
      return;
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user?.id);

    logOperation(
      req.user?.id,
      req.user?.username,
      'change_password',
      'auth',
      getClientIp(req),
      req.headers['user-agent'] || ''
    );

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: '密码修改失败' });
  }
});

router.get('/check-username/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    res.json({ success: true, data: { available: !exists } });
  } catch {
    res.status(500).json({ success: false, error: '检查失败' });
  }
});

router.get('/check-email/:email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.params;
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    res.json({ success: true, data: { available: !exists } });
  } catch {
    res.status(500).json({ success: false, error: '检查失败' });
  }
});

export default router;
