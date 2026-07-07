import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'admin.db');
const db = new Database(dbPath);

// ========== 针对 2G 内存服务器的 SQLite 优化配置 ==========

// WAL 模式：允许并发读写，不影响读性能
db.pragma('journal_mode = WAL');

// 外键约束
db.pragma('foreign_keys = ON');

// 同步模式：NORMAL 牺牲一点持久性换取写入性能
// WAL + NORMAL 是最适合 web 应用的组合
db.pragma('synchronous = NORMAL');

// 缓存大小：默认 -2000（约 2MB），改为 -8000（约 8MB）
// 2G 服务器上给 SQLite 8MB 缓存，平衡内存和性能
db.pragma('cache_size = -8000');

// 临时表存储：内存中（默认），避免磁盘 IO
db.pragma('temp_store = MEMORY');

// mmap 大小：默认 0（禁用），改为 268435456（256MB）
// 利用 mmap 让 OS 管理缓存，减少 SQLite 自己的内存压力
db.pragma('mmap_size = 268435456');

// 忙时超时：默认 5 秒太长，改为 3 秒
// 写入冲突时等待 3 秒而不是立即报错
db.pragma('busy_timeout = 3000');

// 页面大小：默认 4096，保持不变
// db.pragma('page_size = 4096');

// 自动 vacuum：关闭，避免意外 IO 峰值
// 可以通过手动 VACUUM 或定期维护来回收空间
db.pragma('auto_vacuum = NONE');

export { dataDir, dbPath };
export default db;
