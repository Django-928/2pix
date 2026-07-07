/**
 * 生产环境启动入口
 * 开发环境用 nodemon + tsx，生产环境用 node 加载编译后的 JS
 */
import app from './app.js';
import db, { dataDir, dbPath } from './db/index.js';
import fs from 'fs';
import path from 'path';

const backupDir = path.join(dataDir, 'backups');

// ========== 启动时自动备份 ==========
function runAutoBackupOnStartup() {
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    // 检查今天是否已有自动备份
    const existingBackups = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('_auto.db'))
      .filter((f) => f.includes(todayStr));

    if (existingBackups.length > 0) {
      console.log(`[AutoBackup] 今日已有自动备份，跳过: ${existingBackups[0]}`);
      return;
    }

    // 创建自动备份
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    const filename = `backup_${timestamp}_auto.db`;
    const filepath = path.join(backupDir, filename);

    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, filepath);

    const stat = fs.statSync(filepath);
    console.log(`[AutoBackup] 自动备份创建成功: ${filename} (${(stat.size / 1024).toFixed(1)} KB)`);

    // 清理超过 7 份的旧自动备份
    cleanOldAutoBackups(7);
  } catch (error) {
    console.error('[AutoBackup] 自动备份失败:', error);
  }
}

function cleanOldAutoBackups(retentionCount: number) {
  try {
    const autoBackups = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('_auto.db'))
      .sort()
      .reverse(); // 最新的在前

    if (autoBackups.length <= retentionCount) return;

    const toDelete = autoBackups.slice(retentionCount);
    for (const f of toDelete) {
      const filepath = path.join(backupDir, f);
      try {
        fs.unlinkSync(filepath);
        console.log(`[AutoBackup] 清理旧备份: ${f}`);
      } catch {
        // 清理失败不影响启动
      }
    }
  } catch {
    // 清理失败不影响启动
  }
}

// ========== 内存监控 ==========
function setupMemoryMonitor() {
  const MEM_LIMIT_MB = 1800; // 2G 服务器，Node 进程限制在 1.8G

  setInterval(() => {
    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    // 每 5 分钟打印一次内存状态
    const now = new Date().toLocaleTimeString();
    console.log(`[Memory] ${now} | RSS: ${rssMB}MB | Heap: ${heapMB}/${heapTotalMB}MB`);

    // 内存超过阈值警告
    if (rssMB > MEM_LIMIT_MB) {
      console.error(`[Memory] 警告: RSS 内存使用 ${rssMB}MB 超过阈值 ${MEM_LIMIT_MB}MB，建议检查内存泄漏`);
    }
  }, 5 * 60 * 1000); // 每 5 分钟
}

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3001;

// 执行启动时自动备份
runAutoBackupOnStartup();

// 启动内存监控（仅生产环境）
if (process.env.NODE_ENV === 'production') {
  setupMemoryMonitor();
}

const server = app.listen(PORT, () => {
  console.log(`[${process.env.NODE_ENV || 'development'}] 2PIX Server ready on port ${PORT}`);
  console.log(`[System] Node.js ${process.version}, PID: ${process.pid}`);

  // 打印数据库状态
  try {
    const dbStat = fs.statSync(dbPath);
    console.log(`[Database] SQLite size: ${(dbStat.size / 1024).toFixed(1)} KB, WAL mode`);

    const tableCount = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table'").get() as { cnt: number };
    console.log(`[Database] ${tableCount.cnt} tables loaded`);
  } catch {
    // 静默处理
  }
});

// ========== 优雅关闭 ==========
function gracefulShutdown(signal: string) {
  console.log(`[${signal}] 收到关闭信号，正在优雅关闭...`);

  // 停止接受新连接
  server.close(() => {
    console.log(`[${signal}] HTTP 服务器已关闭`);

    // WAL checkpoint 确保数据写入
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      console.log(`[${signal}] 数据库 WAL checkpoint 完成`);
    } catch {
      // 静默处理
    }

    console.log(`[${signal}] 2PIX 服务器已完全关闭`);
    process.exit(0);
  });

  // 超时强制退出
  setTimeout(() => {
    console.error(`[${signal}] 关闭超时，强制退出`);
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('[Fatal] 未捕获异常:', error);
  // 不立即退出，让 PM2 重启
});

process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] 未处理的 Promise 拒绝:', reason);
});

export default app;
