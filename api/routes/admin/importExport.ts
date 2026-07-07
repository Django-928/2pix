import { Router, type Request, type Response } from 'express';
import XLSX from 'xlsx';
import db from '../../db/index.js';
import { authMiddleware, requirePermission, hashPassword, getClientIp, logOperation } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);

// ========== 通用工具 ==========

interface ExportOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

const parseDateRange = (req: Request): ExportOptions => {
  return {
    startDate: String(req.query.startDate || '').trim() || undefined,
    endDate: String(req.query.endDate || '').trim() || undefined,
    limit: Math.min(50000, Math.max(1, parseInt(req.query.limit as string, 10) || 10000)),
  };
};

const applyDateRange = (where: string, params: Array<string | number>, opts: ExportOptions, col = 'created_at') => {
  if (opts.startDate) {
    where += ` AND ${col} >= ?`;
    params.push(opts.startDate);
  }
  if (opts.endDate) {
    where += ` AND ${col} <= ?`;
    params.push(opts.endDate + 'T23:59:59');
  }
  return where;
};

const sendExport = (res: Response, data: Record<string, unknown>[], sheetName: string, filename: string, format: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const bookType = format === 'csv' ? 'csv' : 'xlsx';
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType });

  res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

// ========== 导出用户列表 ==========
router.get('/users/export', requirePermission('user:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'xlsx';
    const opts = parseDateRange(req);

    const params: Array<string | number> = [];
    const where = 'WHERE 1 = 1';
    applyDateRange(where, params, opts);

    const users = db.prepare(`
      SELECT u.id, u.username, u.email, u.phone, u.nickname,
             r.name as role_name, u.status, u.balance,
             u.total_tokens, u.used_tokens, u.last_login_at, u.last_login_ip, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${where}
      ORDER BY u.id ASC
      LIMIT ?
    `).all(...params, opts.limit);

    const data = users.map((u: Record<string, unknown>) => ({
      ID: u.id,
      用户名: u.username,
      邮箱: u.email,
      手机号: u.phone || '',
      昵称: u.nickname || '',
      角色: u.role_name || '',
      状态: u.status === 'active' ? '正常' : u.status === 'disabled' ? '禁用' : '封禁',
      余额: u.balance,
      总Token: u.total_tokens,
      已用Token: u.used_tokens,
      最后登录: u.last_login_at || '',
      最后IP: u.last_login_ip || '',
      注册时间: u.created_at,
    }));

    sendExport(res, data, '用户列表', `users_${new Date().toISOString().slice(0, 10)}.${format}`, format);

    logOperation(req.user?.id, req.user?.username, 'export_users', 'user', getClientIp(req), req.headers['user-agent'] || '', { format, count: users.length });
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ success: false, error: '导出用户失败' });
  }
});

// ========== 导入用户列表 ==========
router.post('/users/import', requirePermission('user:create'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { file } = req.body;

    if (!file) {
      res.status(400).json({ success: false, error: '请上传文件' });
      return;
    }

    const workbook = XLSX.read(file, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    if (data.length === 0) {
      res.status(400).json({ success: false, error: '文件中没有数据' });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const userRole = db.prepare("SELECT id FROM roles WHERE name = 'user'").get() as { id: number } | undefined;

    const insertUser = db.prepare(`
      INSERT INTO users (username, email, phone, password_hash, nickname, role_id, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const insertMany = db.transaction((userList: typeof data) => {
      for (let i = 0; i < userList.length; i++) {
        const row = userList[i];
        try {
          const username = row['用户名'] || row['username'] as string;
          const email = row['邮箱'] || row['email'] as string;
          const password = (row['密码'] || row['password'] || '123456') as string;

          if (!username || !email) {
            failCount++;
            errors.push(`第${i + 2}行: 用户名或邮箱为空`);
            continue;
          }

          const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);

          if (existing) {
            failCount++;
            errors.push(`第${i + 2}行: 用户名或邮箱已存在`);
            continue;
          }

          const passwordHash = hashPassword(password);
          insertUser.run(
            username,
            email,
            (row['手机号'] || row['phone'] || '') as string,
            passwordHash,
            (row['昵称'] || row['nickname'] || username) as string,
            userRole?.id || null,
            parseFloat((row['余额'] || row['balance'] || 0) as string)
          );
          successCount++;
        } catch (e) {
          failCount++;
          errors.push(`第${i + 2}行: ${(e as Error).message}`);
        }
      }
    });

    insertMany(data);

    logOperation(req.user?.id, req.user?.username, 'import_users', 'user', getClientIp(req), req.headers['user-agent'] || '', { successCount, failCount });

    res.json({
      success: true,
      message: '导入完成',
      data: {
        successCount,
        failCount,
        total: data.length,
        errors: errors.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Import users error:', error);
    res.status(500).json({ success: false, error: '导入用户失败' });
  }
});

// ========== 导出交易记录 ==========
router.get('/transactions/export', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'xlsx';
    const opts = parseDateRange(req);

    const params: Array<string | number> = [];
    const where = 'WHERE 1 = 1';
    applyDateRange(where, params, opts);

    const transactions = db.prepare(`
      SELECT t.id, t.user_id, u.username, u.email, t.type, t.amount,
             t.balance_before, t.balance_after, t.description, t.related_id, t.created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ${where}
      ORDER BY t.id DESC
      LIMIT ?
    `).all(...params, opts.limit);

    const typeLabels: Record<string, string> = {
      recharge: '充值',
      consume: '消费',
      usage: '使用扣费',
      refund: '退款',
      checkin: '签到奖励',
      invite: '邀请奖励',
      admin: '管理员调整',
      system: '系统调整',
    };

    const data = transactions.map((t: Record<string, unknown>) => ({
      ID: t.id,
      用户名: t.username,
      邮箱: t.email,
      类型: typeLabels[t.type as string] || t.type,
      金额: t.amount,
      变动前余额: t.balance_before,
      变动后余额: t.balance_after,
      描述: t.description || '',
      关联ID: t.related_id || '',
      时间: t.created_at,
    }));

    sendExport(res, data, '交易记录', `transactions_${new Date().toISOString().slice(0, 10)}.${format}`, format);
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ success: false, error: '导出交易记录失败' });
  }
});

// ========== 导出订单列表 ==========
router.get('/orders/export', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'xlsx';
    const opts = parseDateRange(req);

    const params: Array<string | number> = [];
    const where = 'WHERE 1 = 1';
    applyDateRange(where, params, opts);

    const orders = db.prepare(`
      SELECT o.id, o.order_no, o.user_id, u.username, u.email,
             o.amount, o.tokens, o.status, o.payment_method,
             o.payment_time, o.expires_at, o.closed_at, o.close_reason, o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${where}
      ORDER BY o.id DESC
      LIMIT ?
    `).all(...params, opts.limit);

    const statusLabels: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      expired: '已过期',
      closed: '已关闭',
    };

    const data = orders.map((o: Record<string, unknown>) => ({
      ID: o.id,
      订单号: o.order_no,
      用户名: o.username,
      邮箱: o.email,
      金额: o.amount,
      Token数: o.tokens,
      状态: statusLabels[o.status as string] || o.status,
      支付方式: o.payment_method || '',
      支付时间: o.payment_time || '',
      过期时间: o.expires_at || '',
      关闭时间: o.closed_at || '',
      关闭原因: o.close_reason || '',
      创建时间: o.created_at,
    }));

    sendExport(res, data, '订单列表', `orders_${new Date().toISOString().slice(0, 10)}.${format}`, format);

    logOperation(req.user?.id, req.user?.username, 'export_orders', 'billing', getClientIp(req), req.headers['user-agent'] || '', { format, count: orders.length });
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ success: false, error: '导出订单失败' });
  }
});

// ========== 导出作品列表 ==========
router.get('/works/export', requirePermission('system:config'), async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'xlsx';
    const opts = parseDateRange(req);

    const params: Array<string | number> = [];
    const where = 'WHERE 1 = 1';
    applyDateRange(where, params, opts);

    const works = db.prepare(`
      SELECT w.id, w.user_id, u.username, u.email, w.name, w.type, w.status,
             w.output_url, w.provider, w.model, w.review_status, w.review_reason,
             w.reviewed_at, w.created_at
      FROM works w
      JOIN users u ON w.user_id = u.id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT ?
    `).all(...params, opts.limit);

    const typeLabels: Record<string, string> = { image: '图片', video: '视频', audio: '音频' };
    const statusLabels: Record<string, string> = { pending: '处理中', complete: '完成', failed: '失败' };
    const reviewLabels: Record<string, string> = { pending: '待审核', approved: '已通过', violated: '违规', taken_down: '已下架' };

    const data = works.map((w: Record<string, unknown>) => ({
      ID: w.id,
      用户名: w.username,
      邮箱: w.email,
      作品名称: w.name,
      类型: typeLabels[w.type as string] || w.type,
      生成状态: statusLabels[w.status as string] || w.status,
      审核状态: reviewLabels[w.review_status as string] || w.review_status || '待审核',
      审核原因: w.review_reason || '',
      模型: w.model || '',
      服务商: w.provider || '',
      输出地址: w.output_url || '',
      审核时间: w.reviewed_at || '',
      创建时间: w.created_at,
    }));

    sendExport(res, data, '作品列表', `works_${new Date().toISOString().slice(0, 10)}.${format}`, format);

    logOperation(req.user?.id, req.user?.username, 'export_works', 'work', getClientIp(req), req.headers['user-agent'] || '', { format, count: works.length });
  } catch (error) {
    console.error('Export works error:', error);
    res.status(500).json({ success: false, error: '导出作品失败' });
  }
});

// ========== 导出账单用量 ==========
router.get('/usage/export', requirePermission('billing:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'xlsx';
    const opts = parseDateRange(req);

    const params: Array<string | number> = [];
    const where = 'WHERE 1 = 1';
    applyDateRange(where, params, opts);

    const usage = db.prepare(`
      SELECT tu.id, tu.user_id, u.username, u.email,
             tu.model, tu.category, tu.input_tokens, tu.output_tokens,
             tu.cost, tu.task_id, tu.status, tu.created_at
      FROM token_usage tu
      JOIN users u ON tu.user_id = u.id
      ${where}
      ORDER BY tu.id DESC
      LIMIT ?
    `).all(...params, opts.limit);

    const categoryLabels: Record<string, string> = {
      image: '图片生成',
      video: '视频生成',
      audio: '音频生成',
      chat: '对话',
      embedding: '嵌入',
    };
    const statusLabels: Record<string, string> = {
      completed: '完成',
      failed: '失败',
      refunded: '已退款',
    };

    const data = usage.map((u: Record<string, unknown>) => ({
      ID: u.id,
      用户名: u.username,
      邮箱: u.email,
      模型: u.model,
      分类: categoryLabels[u.category as string] || u.category,
      输入Token: u.input_tokens,
      输出Token: u.output_tokens,
      费用: u.cost,
      任务ID: u.task_id || '',
      状态: statusLabels[u.status as string] || u.status,
      时间: u.created_at,
    }));

    sendExport(res, data, '模型调用', `usage_${new Date().toISOString().slice(0, 10)}.${format}`, format);

    logOperation(req.user?.id, req.user?.username, 'export_usage', 'billing', getClientIp(req), req.headers['user-agent'] || '', { format, count: usage.length });
  } catch (error) {
    console.error('Export usage error:', error);
    res.status(500).json({ success: false, error: '导出账单用量失败' });
  }
});

// ========== 导出操作日志 ==========
router.get('/logs/export', requirePermission('log:view'), async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'xlsx';
    const opts = parseDateRange(req);

    const params: Array<string | number> = [];
    const where = 'WHERE 1 = 1';
    applyDateRange(where, params, opts);

    const logs = db.prepare(`
      SELECT id, user_id, username, action, module, ip_address, details, created_at
      FROM operation_logs
      ${where}
      ORDER BY id DESC
      LIMIT ?
    `).all(...params, opts.limit);

    const data = logs.map((l: Record<string, unknown>) => ({
      ID: l.id,
      用户ID: l.user_id || '',
      用户名: l.username || '',
      操作: l.action,
      模块: l.module,
      IP地址: l.ip_address || '',
      详情: typeof l.details === 'string' ? l.details : '',
      时间: l.created_at,
    }));

    sendExport(res, data, '操作日志', `logs_${new Date().toISOString().slice(0, 10)}.${format}`, format);

    logOperation(req.user?.id, req.user?.username, 'export_logs', 'log', getClientIp(req), req.headers['user-agent'] || '', { format, count: logs.length });
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({ success: false, error: '导出操作日志失败' });
  }
});

// ========== 导出统计概览 ==========
router.get('/export-info', requirePermission('system:config'), async (req: Request, res: Response) => {
  try {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM orders) as orders_count,
        (SELECT COUNT(*) FROM works) as works_count,
        (SELECT COUNT(*) FROM token_usage) as usage_count,
        (SELECT COUNT(*) FROM transactions) as transactions_count,
        (SELECT COUNT(*) FROM operation_logs) as logs_count
    `).get() as Record<string, number>;

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get export info error:', error);
    res.status(500).json({ success: false, error: '获取导出统计失败' });
  }
});

export default router;
