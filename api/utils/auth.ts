import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || '2pix-admin-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role_id: number | null;
  role_name?: string;
  status: string;
  balance: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

export const comparePassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};

export const generateToken = (user: AuthUser): string => {
  const payload = { id: user.id, username: user.username, role_id: user.role_id, iat: Math.floor(Date.now() / 1000) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): AuthUser | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded = (jwt as any).verify(token, JWT_SECRET) as { id: number; username: string; role_id: number };
    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.role_id, u.status, u.balance, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(decoded.id) as AuthUser | undefined;
    return user || null;
  } catch {
    return null;
  }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ success: false, error: '账户已被禁用' });
    return;
  }

  req.user = user;
  next();
};

export function generateApiKey(): string {
  const random = crypto.randomBytes(24).toString('hex');
  return `sk-2pix-${random}`;
}

export function hashApiKey(apiKey: string): string {
  return bcrypt.hashSync(apiKey, 10);
}

export function verifyApiKey(apiKey: string): { user: AuthUser | null; keyId: number | null } {
  if (!apiKey.startsWith('sk-2pix-')) {
    return { user: null, keyId: null };
  }
  const prefix = apiKey.slice(0, 16);
  const candidates = db.prepare('SELECT id, user_id, key_hash, enabled FROM api_keys WHERE key_prefix = ?').all(prefix) as Array<{ id: number; user_id: number; key_hash: string; enabled: number }>;
  for (const candidate of candidates) {
    if (bcrypt.compareSync(apiKey, candidate.key_hash)) {
      if (!candidate.enabled) {
        return { user: null, keyId: null };
      }
      const user = db.prepare(`
        SELECT u.id, u.username, u.email, u.role_id, u.status, u.balance, r.name as role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `).get(candidate.user_id) as AuthUser | undefined;
      if (user && user.status === 'active') {
        return { user, keyId: candidate.id };
      }
      return { user: null, keyId: null };
    }
  }
  return { user: null, keyId: null };
}

export const apiKeyOrAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.substring(7);

  if (token.startsWith('sk-2pix-')) {
    const { user, keyId } = verifyApiKey(token);
    if (!user) {
      res.status(401).json({ success: false, error: 'API Key 无效或已停用' });
      return;
    }
    if (keyId) {
      db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyId);
    }
    req.user = user;
    next();
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ success: false, error: '账户已被禁用' });
    return;
  }

  req.user = user;
  next();
};

export const requirePermission = (permissionName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    if (!req.user.role_id) {
      res.status(403).json({ success: false, error: '无权限访问' });
      return;
    }

    const result = db.prepare(`
      SELECT 1
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.name = ?
    `).get(req.user.role_id, permissionName);

    if (!result) {
      res.status(403).json({ success: false, error: '无权限访问' });
      return;
    }

    next();
  };
};

export const getClientIp = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    '';
};

const SENSITIVE_DETAIL_KEYS = ['password', 'token', 'secret', 'apikey', 'api_key', 'privatekey', 'publickey', 'apiv3key'];

const maskAuditValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  if (!value) return value;
  if (value.length <= 4) return '••••••••';
  return `${value.slice(0, 4)}••••••••`;
};

const sanitizeAuditDetails = (details: unknown): unknown => {
  if (Array.isArray(details)) {
    return details.map((item) => sanitizeAuditDetails(item));
  }
  if (!details || typeof details !== 'object') {
    return details;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_DETAIL_KEYS.some((word) => lowerKey.includes(word))) {
      sanitized[key] = maskAuditValue(value);
    } else {
      sanitized[key] = sanitizeAuditDetails(value);
    }
  }
  return sanitized;
};

export const logOperation = (
  userId: number | undefined,
  username: string | undefined,
  action: string,
  module: string,
  ip: string,
  userAgent: string,
  details?: Record<string, unknown>
) => {
  db.prepare(`
    INSERT INTO operation_logs (user_id, username, action, module, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    username || null,
    action,
    module,
    ip,
    userAgent,
    details ? JSON.stringify(sanitizeAuditDetails(details)) : null
  );
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

export const checkPasswordStrength = (password: string): { score: number; level: string; message: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  let level = '弱';
  let message = '密码强度较弱';
  if (score >= 4) {
    level = '强';
    message = '密码强度强';
  } else if (score >= 3) {
    level = '中';
    message = '密码强度中等';
  }

  return { score, level, message };
};

export const generateOrderNo = (): string => {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${dateStr}${random}`;
};
