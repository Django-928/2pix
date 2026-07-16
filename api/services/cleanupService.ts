import type Database from 'better-sqlite3';

let db: Database.Database;

export function initCleanupService(database: Database.Database) {
  db = database;
  // 启动时先执行一次
  cleanupExpiredWorks();
  // 每6小时执行一次
  setInterval(cleanupExpiredWorks, 6 * 60 * 60 * 1000);
}

function cleanupExpiredWorks() {
  try {
    const result = db.prepare(
      "DELETE FROM works WHERE type IN ('image', 'video') AND created_at < datetime('now', '-48 hours')"
    ).run();
    if (result.changes > 0) {
      console.log(`[cleanup] 已清理 ${result.changes} 条超过48小时的图片/视频资产`);
    }
  } catch (error) {
    console.error('[cleanup] 自动清理失败:', error);
  }
}
