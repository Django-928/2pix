import db from '../db/index.js';

export interface MembershipPlan {
  id: number;
  name: string;
  amount: number;
  tokens: number;
  badge: string | null;
  tone: string | null;
  description: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const toneOptions = [
  'from-cyan-500/20 to-blue-500/10',
  'from-amber-500/25 to-orange-500/10',
  'from-purple-500/20 to-fuchsia-500/10',
  'from-emerald-500/20 to-teal-500/10',
  'from-rose-500/20 to-pink-500/10',
  'from-blue-500/20 to-indigo-500/10',
];

export function seedDefaultPlans() {
  const count = db.prepare('SELECT COUNT(*) as total FROM membership_plans').get() as { total: number };
  if (count.total > 0) return;

  const plans = [
    { name: '体验包', amount: 29, tokens: 3000, badge: '新手推荐', tone: toneOptions[0], sort_order: 1 },
    { name: '创作包', amount: 99, tokens: 12000, badge: '最受欢迎', tone: toneOptions[1], sort_order: 2 },
    { name: '专业包', amount: 299, tokens: 42000, badge: '团队常用', tone: toneOptions[2], sort_order: 3 },
    { name: '企业包', amount: 999, tokens: 160000, badge: 'API 优先', tone: toneOptions[3], sort_order: 4 },
  ];

  const insert = db.prepare(`
    INSERT INTO membership_plans (name, amount, tokens, badge, tone, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const plan of plans) {
    insert.run(plan.name, plan.amount, plan.tokens, plan.badge, plan.tone, plan.sort_order);
  }
}

export function listPlans(filters: { status?: string; page?: number; pageSize?: number } = {}) {
  const { status, page, pageSize } = filters;
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (page && pageSize) {
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM membership_plans ${whereSql}`).get(...params) as { total: number };
    const offset = (page - 1) * pageSize;
    const rows = db.prepare(`
      SELECT * FROM membership_plans ${whereSql}
      ORDER BY sort_order ASC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as MembershipPlan[];

    return { list: rows, total: countRow.total, page, pageSize };
  }

  const rows = db.prepare(`
    SELECT * FROM membership_plans ${whereSql}
    ORDER BY sort_order ASC, created_at DESC
  `).get(...params) as MembershipPlan[];

  return { list: rows, total: rows.length, page: 1, pageSize: rows.length };
}

export function getActivePlans(): MembershipPlan[] {
  return db.prepare(`
    SELECT * FROM membership_plans WHERE status = 'active'
    ORDER BY sort_order ASC, created_at DESC
  `).all() as MembershipPlan[];
}

export function createPlan(plan: Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>): MembershipPlan {
  const result = db.prepare(`
    INSERT INTO membership_plans (name, amount, tokens, badge, tone, description, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    plan.name,
    plan.amount,
    plan.tokens,
    plan.badge || null,
    plan.tone || toneOptions[0],
    plan.description || null,
    plan.sort_order,
    plan.status || 'active',
  );

  return db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(result.lastInsertRowid) as MembershipPlan;
}

export function updatePlan(id: number, updates: Partial<Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>>): MembershipPlan | undefined {
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.amount !== undefined) { fields.push('amount = ?'); params.push(updates.amount); }
  if (updates.tokens !== undefined) { fields.push('tokens = ?'); params.push(updates.tokens); }
  if (updates.badge !== undefined) { fields.push('badge = ?'); params.push(updates.badge); }
  if (updates.tone !== undefined) { fields.push('tone = ?'); params.push(updates.tone); }
  if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
  if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); params.push(updates.sort_order); }
  if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }

  if (fields.length === 0) return getPlanById(id);

  params.push(id);
  db.prepare(`UPDATE membership_plans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
  return getPlanById(id);
}

export function getPlanById(id: number): MembershipPlan | undefined {
  return db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(id) as MembershipPlan | undefined;
}

export function deletePlan(id: number): boolean {
  const result = db.prepare('DELETE FROM membership_plans WHERE id = ?').run(id);
  return result.changes > 0;
}
