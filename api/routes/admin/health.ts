import { Router, type Request, type Response } from 'express';
import db, { dbPath } from '../../db/index.js';
import fs from 'fs';
import os from 'os';
import { authMiddleware, requirePermission } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('health:view'));

// 系统健康概览
router.get('/', async (_req: Request, res: Response) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    // 数据库统计
    const dbStat = fs.statSync(dbPath);
    const walPath = dbPath + '-wal';
    const walSize = fs.existsSync(walPath) ? fs.statSync(walPath).size : 0;

    // 今日新增用户
    const todayUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')").get() as { cnt: number };

    // 今日活跃用户（有登录或操作的）
    const todayActive = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM operation_logs WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime') AND user_id IS NOT NULL").get() as { cnt: number };

    // 今日订单
    const todayOrders = db.prepare("SELECT COUNT(*) as cnt, SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) as expired FROM orders WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')").get() as { cnt: number; paid: number | null; pending: number | null; expired: number | null };

    // 今日生成任务
    const todayWorks = db.prepare("SELECT COUNT(*) as cnt, SUM(CASE WHEN status='complete' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed FROM works WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')").get() as { cnt: number; completed: number | null; failed: number | null };

    // 今日积分消耗
    const todayConsumption = db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE type IN ('consume', 'usage') AND amount < 0 AND DATE(created_at, 'localtime') = DATE('now', 'localtime')").get() as { total: number };

    // 今日充值
    const todayRecharge = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'recharge' AND amount > 0 AND DATE(created_at, 'localtime') = DATE('now', 'localtime')").get() as { total: number };

    // 今日接口错误（通过操作日志）
    const todayErrors = db.prepare("SELECT COUNT(*) as cnt FROM operation_logs WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime') AND details LIKE '%error%'").get() as { cnt: number };

    // 待审核作品
    const pendingReview = db.prepare("SELECT COUNT(*) as cnt FROM works WHERE review_status = 'pending' AND status = 'complete'").get() as { cnt: number };

    // 违规作品
    const violatedWorks = db.prepare("SELECT COUNT(*) as cnt FROM works WHERE review_status = 'violated'").get() as { cnt: number };

    // 被封禁/禁用用户
    const bannedUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE status IN ('banned', 'disabled')").get() as { cnt: number };

    // 锁定账户
    const lockedAccounts = db.prepare("SELECT COUNT(*) as cnt FROM login_failures WHERE locked_until > datetime('now')").get() as { cnt: number };

    // 总用户数和余额
    const totalStats = db.prepare("SELECT COUNT(*) as users, COALESCE(SUM(balance), 0) as total_balance FROM users").get() as { users: number; total_balance: number };

    // 最近 7 天趋势
    const weeklyTrend = db.prepare(`
      SELECT
        DATE(created_at, 'localtime') as date,
        SUM(CASE WHEN type IN ('consume', 'usage') AND amount < 0 THEN ABS(amount) ELSE 0 END) as consumption,
        SUM(CASE WHEN type = 'recharge' AND amount > 0 THEN amount ELSE 0 END) as recharge
      FROM transactions
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at, 'localtime')
      ORDER BY date ASC
    `).all() as Array<{ date: string; consumption: number; recharge: number }>;

    // 最近 7 天每天新增用户
    const weeklyUsers = db.prepare(`
      SELECT DATE(created_at, 'localtime') as date, COUNT(*) as cnt
      FROM users
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at, 'localtime')
      ORDER BY date ASC
    `).all() as Array<{ date: string; cnt: number }>;

    // 最近 10 条安全事件
    const recentSecurity = db.prepare(`
      SELECT id, username, action, module, ip_address, created_at
      FROM operation_logs
      WHERE action IN ('login_failure', 'update_password', 'update_user_status', 'delete_user', 'admin_delete_work', 'admin_review_work', 'admin_batch_review_work')
      ORDER BY id DESC
      LIMIT 10
    `).all();

    // 异常订单（今日 expired 或 pending 超过 30 分钟）
    const abnormalOrders = db.prepare(`
      SELECT id, order_no, user_id, amount, status, created_at
      FROM orders
      WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
        AND status IN ('expired', 'closed')
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // 失败生成任务（今日）
    const failedWorks = db.prepare(`
      SELECT w.id, w.name, w.type, w.model, w.user_id, u.username, w.created_at
      FROM works w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.status = 'failed' AND DATE(w.created_at, 'localtime') = DATE('now', 'localtime')
      ORDER BY w.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        // 系统状态
        system: {
          uptime: Math.round(uptime),
          nodeVersion: process.version,
          pid: process.pid,
          memory: { rssMB, heapMB, heapTotalMB },
          cpu: os.cpus().length,
          platform: os.platform(),
        },
        // 数据库
        database: {
          sizeMB: (dbStat.size / 1024 / 1024).toFixed(2),
          walSizeMB: (walSize / 1024 / 1024).toFixed(2),
        },
        // 今日概览
        today: {
          newUsers: todayUsers.cnt,
          activeUsers: todayActive.cnt,
          orders: todayOrders.cnt,
          paidOrders: todayOrders.paid || 0,
          expiredOrders: todayOrders.expired || 0,
          works: todayWorks.cnt,
          completedWorks: todayWorks.completed || 0,
          failedWorks: todayWorks.failed || 0,
          consumption: todayConsumption.total,
          recharge: todayRecharge.total,
          errors: todayErrors.cnt,
        },
        // 待处理事项
        pending: {
          reviewWorks: pendingReview.cnt,
          violatedWorks: violatedWorks.cnt,
          bannedUsers: bannedUsers.cnt,
          lockedAccounts: lockedAccounts.cnt,
        },
        // 累计数据
        total: {
          users: totalStats.users,
          totalBalance: totalStats.total_balance,
        },
        // 7 天趋势
        weeklyTrend,
        weeklyUsers,
        // 近期异常
        recentSecurity,
        abnormalOrders,
        failedWorks,
      },
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ success: false, error: '获取系统健康数据失败' });
  }
});

export default router;
