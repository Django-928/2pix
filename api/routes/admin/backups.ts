import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import db, { dataDir, dbPath } from '../../db/index.js';
import { authMiddleware, getClientIp, logOperation, requirePermission } from '../../utils/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('backup:manage'));

// 备份目录
const backupDir = path.join(dataDir, 'backups');

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

interface BackupInfo {
  filename: string;
  filepath: string;
  size: number;
  createdAt: string;
  isAuto: boolean;
}

// 解析备份文件名，提取时间戳
const parseBackupFilename = (filename: string): string | null => {
  const match = filename.match(/^backup_(\d{8}_\d{6})(?:_auto)?\.db$/);
  return match ? match[1] : null;
};

const formatBackupTime = (timestamp: string): string => {
  // 格式: YYYYMMDD_HHMMSS -> 可读时间
  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)} ${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13, 15)}`;
};

// 备份列表
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(backupDir)) {
      res.json({ success: true, data: { list: [], totalSize: 0 } });
      return;
    }

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
      .map((f) => {
        const filepath = path.join(backupDir, f);
        const stat = fs.statSync(filepath);
        const timestamp = parseBackupFilename(f);
        return {
          filename: f,
          filepath,
          size: stat.size,
          createdAt: timestamp ? formatBackupTime(timestamp) : stat.mtime.toISOString(),
          isAuto: f.includes('_auto'),
        } as BackupInfo;
      })
      .sort((a, b) => b.size - a.size); // 按文件大小降序（最新的通常最大）

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    // 获取数据库文件大小
    const dbStat = fs.statSync(dbPath);

    res.json({
      success: true,
      data: {
        list: files,
        totalSize,
        dbSize: dbStat.size,
        dbPath,
      },
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ success: false, error: '获取备份列表失败' });
  }
});

// 创建手动备份
router.post('/create', async (req: Request, res: Response) => {
  try {
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

    const filename = `backup_${timestamp}.db`;
    const filepath = path.join(backupDir, filename);

    // 使用 SQLite backup API（比文件复制更安全）
    // better-sqlite3 的 backup 方法
    db.pragma('wal_checkpoint(TRUNCATE)');
    fs.copyFileSync(dbPath, filepath);

    const stat = fs.statSync(filepath);

    logOperation(
      req.user?.id,
      req.user?.username,
      'admin_create_backup',
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { filename, size: stat.size }
    );

    res.json({
      success: true,
      message: '备份创建成功',
      data: {
        filename,
        size: stat.size,
        createdAt: formatBackupTime(timestamp),
      },
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ success: false, error: '创建备份失败' });
  }
});

// 下载备份
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    // 安全检查：只允许备份文件名格式
    if (!filename.startsWith('backup_') || !filename.endsWith('.db') || filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ success: false, error: '无效的文件名' });
      return;
    }

    const filepath = path.join(backupDir, filename);
    if (!fs.existsSync(filepath)) {
      res.status(404).json({ success: false, error: '备份文件不存在' });
      return;
    }

    const stat = fs.statSync(filepath);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);

    const readStream = fs.createReadStream(filepath);
    readStream.pipe(res);

    logOperation(
      req.user?.id,
      req.user?.username,
      'admin_download_backup',
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { filename, size: stat.size }
    );
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ success: false, error: '下载备份失败' });
  }
});

// 删除备份
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    if (!filename.startsWith('backup_') || !filename.endsWith('.db') || filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ success: false, error: '无效的文件名' });
      return;
    }

    const filepath = path.join(backupDir, filename);
    if (!fs.existsSync(filepath)) {
      res.status(404).json({ success: false, error: '备份文件不存在' });
      return;
    }

    const stat = fs.statSync(filepath);
    fs.unlinkSync(filepath);

    logOperation(
      req.user?.id,
      req.user?.username,
      'admin_delete_backup',
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { filename, size: stat.size }
    );

    res.json({ success: true, message: '备份已删除' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ success: false, error: '删除备份失败' });
  }
});

// 数据库统计信息
router.get('/db-stats', async (_req: Request, res: Response) => {
  try {
    const dbStat = fs.statSync(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>;

    const tableStats = tables.map((t) => {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get() as { cnt: number };
      return { name: t.name, rows: count.cnt };
    });

    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    const walSize = fs.existsSync(walPath) ? fs.statSync(walPath).size : 0;
    const shmSize = fs.existsSync(shmPath) ? fs.statSync(shmPath).size : 0;

    res.json({
      success: true,
      data: {
        dbSize: dbStat.size,
        walSize,
        shmSize,
        totalSize: dbStat.size + walSize + shmSize,
        tables: tableStats,
      },
    });
  } catch (error) {
    console.error('Get db stats error:', error);
    res.status(500).json({ success: false, error: '获取数据库统计失败' });
  }
});

export default router;
