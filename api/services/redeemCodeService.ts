import db from '../db/index.js';

export interface RedeemCode {
  id: number;
  code: string;
  tokens: number;
  status: 'active' | 'used' | 'expired' | 'disabled';
  totalUsage: number;
  usedCount: number;
  validStart: string | null;
  validEnd: string | null;
  description: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RedeemRecord {
  id: number;
  codeId: number;
  userId: number;
  code: string;
  tokens: number;
  beforeBalance: number;
  afterBalance: number;
  ipAddress: string | null;
  createdAt: string;
}

export interface RedeemCodeFilters {
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function generateCode(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createRedeemCodes(options: {
  count: number;
  tokens: number;
  totalUsage?: number;
  validStart?: string;
  validEnd?: string;
  description?: string;
  createdBy?: number;
}): RedeemCode[] {
  const { count, tokens, totalUsage = 1, validStart, validEnd, description, createdBy } = options;
  const codes: RedeemCode[] = [];

  db.prepare('BEGIN').run();
  try {
    const insert = db.prepare(`
      INSERT INTO redeem_codes (code, tokens, status, total_usage, used_count, valid_start, valid_end, description, created_by)
      VALUES (?, ?, 'active', ?, 0, ?, ?, ?, ?)
    `);

    for (let i = 0; i < count; i++) {
      let code = generateCode();
      let attempts = 0;
      while (db.prepare('SELECT id FROM redeem_codes WHERE code = ?').get(code)) {
        code = generateCode();
        attempts++;
        if (attempts > 10) {
          throw new Error('生成唯一兑换码失败，请重试');
        }
      }

      const result = insert.run(
        code,
        tokens,
        totalUsage,
        validStart || null,
        validEnd || null,
        description || null,
        createdBy || null,
      );

      const row = db.prepare('SELECT * FROM redeem_codes WHERE id = ?').get(result.lastInsertRowid) as RedeemCode;
      codes.push(row);
    }

    db.prepare('COMMIT').run();
  } catch (error) {
    db.prepare('ROLLBACK').run();
    throw error;
  }

  return codes;
}

export function listRedeemCodes(filters: RedeemCodeFilters = {}) {
  const { status, keyword, page = 1, pageSize = 20 } = filters;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (keyword) {
    where.push('(code LIKE ? OR description LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM redeem_codes ${whereSql}`).get(...params) as { total: number };

  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT rc.*, u.username as created_by_name
    FROM redeem_codes rc
    LEFT JOIN users u ON rc.created_by = u.id
    ${whereSql}
    ORDER BY rc.created_at DESC
    LIMIT ? OFFSET ?
  `).get(...params, pageSize, offset) as RedeemCode[];

  return {
    list: rows,
    total: countRow.total,
    page,
    pageSize,
  };
}

export function getRedeemCodeById(id: number): RedeemCode | undefined {
  return db.prepare('SELECT * FROM redeem_codes WHERE id = ?').get(id) as RedeemCode | undefined;
}

export function updateRedeemCode(
  id: number,
  updates: Partial<Pick<RedeemCode, 'status' | 'description' | 'validStart' | 'validEnd'>>,
): RedeemCode | undefined {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.status !== undefined) {
    sets.push('status = ?');
    params.push(updates.status);
  }
  if (updates.description !== undefined) {
    sets.push('description = ?');
    params.push(updates.description);
  }
  if (updates.validStart !== undefined) {
    sets.push('valid_start = ?');
    params.push(updates.validStart);
  }
  if (updates.validEnd !== undefined) {
    sets.push('valid_end = ?');
    params.push(updates.validEnd);
  }

  if (sets.length === 0) return getRedeemCodeById(id);

  params.push(id);
  db.prepare(`UPDATE redeem_codes SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
  return getRedeemCodeById(id);
}

export function deleteRedeemCode(id: number): boolean {
  const result = db.prepare('DELETE FROM redeem_codes WHERE id = ?').run(id);
  return result.changes > 0;
}

export function redeemCode(options: {
  code: string;
  userId: number;
  ipAddress?: string;
}): { tokens: number; balanceAfter: number } {
  const { code, userId, ipAddress } = options;

  db.prepare('BEGIN').run();
  try {
    const row = db.prepare('SELECT * FROM redeem_codes WHERE code = ?').get(code) as RedeemCode | undefined;
    if (!row) {
      throw new Error('兑换码不存在');
    }

    if (row.status === 'disabled') {
      throw new Error('兑换码已失效');
    }

    if (row.status === 'used' && row.usedCount >= row.totalUsage) {
      throw new Error('兑换码已被使用');
    }

    const now = new Date().toISOString();
    if (row.validStart && now < row.validStart) {
      throw new Error('兑换码尚未生效');
    }
    if (row.validEnd && now > row.validEnd) {
      throw new Error('兑换码已过期');
    }

    const alreadyUsed = db.prepare('SELECT id FROM redeem_records WHERE code_id = ? AND user_id = ?').get(row.id, userId);
    if (alreadyUsed) {
      throw new Error('每个账号只能兑换一次该兑换码');
    }

    const user = db.prepare('SELECT id, balance FROM users WHERE id = ?').get(userId) as { id: number; balance: number } | undefined;
    if (!user) {
      throw new Error('用户不存在');
    }

    const newUsedCount = row.usedCount + 1;
    const newStatus = newUsedCount >= row.totalUsage ? 'used' : row.status;
    const balanceAfter = Number(user.balance) + row.tokens;

    db.prepare('UPDATE redeem_codes SET used_count = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      newUsedCount,
      newStatus,
      row.id,
    );

    db.prepare('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceAfter, userId);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, related_id)
      VALUES (?, 'redeem', ?, ?, ?, ?, ?)
    `).run(userId, row.tokens, user.balance, balanceAfter, `兑换码兑换：${code}`, `redeem-${row.id}`);

    db.prepare(`
      INSERT INTO redeem_records (code_id, user_id, code, tokens, before_balance, after_balance, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, userId, code, row.tokens, user.balance, balanceAfter, ipAddress || null);

    db.prepare('COMMIT').run();

    return { tokens: row.tokens, balanceAfter };
  } catch (error) {
    db.prepare('ROLLBACK').run();
    throw error;
  }
}

export function listRedeemRecords(filters: {
  codeId?: number;
  userId?: number;
  page?: number;
  pageSize?: number;
} = {}) {
  const { codeId, userId, page = 1, pageSize = 20 } = filters;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (codeId) {
    where.push('rr.code_id = ?');
    params.push(codeId);
  }
  if (userId) {
    where.push('rr.user_id = ?');
    params.push(userId);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM redeem_records ${whereSql}`).get(...params) as { total: number };

  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT rr.*, u.username, u.nickname
    FROM redeem_records rr
    LEFT JOIN users u ON rr.user_id = u.id
    ${whereSql}
    ORDER BY rr.created_at DESC
    LIMIT ? OFFSET ?
  `).get(...params, pageSize, offset) as (RedeemRecord & { username: string; nickname: string })[];

  return {
    list: rows,
    total: countRow.total,
    page,
    pageSize,
  };
}
