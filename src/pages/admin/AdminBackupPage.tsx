import { useCallback, useEffect, useState } from 'react';
import { Database, Download, HardDrive, Plus, RefreshCw, Trash2, Table2, Clock, AlertTriangle } from 'lucide-react';
import api from '@/utils/api';

interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
  isAuto: boolean;
}

interface BackupListData {
  list: BackupInfo[];
  totalSize: number;
  dbSize: number;
}

interface DbStats {
  dbSize: number;
  walSize: number;
  shmSize: number;
  totalSize: number;
  tables: Array<{ name: string; rows: number }>;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function AdminBackupPage() {
  const [data, setData] = useState<BackupListData | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [backupData, statsData] = await Promise.all([
        api.get<BackupListData>('/admin/backups'),
        api.get<DbStats>('/admin/backups/db-stats'),
      ]);
      setData(backupData);
      setDbStats(statsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const handleCreate = async () => {
    if (!confirm('确认创建数据库备份？')) return;
    setCreating(true);
    try {
      await api.post('/admin/backups/create');
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建备份失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (filename: string) => {
    const token = localStorage.getItem('admin_token') || '';
    window.open(`/api/admin/backups/download/${filename}?token=${token}`, '_blank');
  };

  const handleDelete = async (backup: BackupInfo) => {
    if (!confirm(`确认删除备份「${backup.filename}」？此操作不可恢复。`)) return;
    try {
      await api.delete(`/admin/backups/${encodeURIComponent(backup.filename)}`);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除备份失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">数据库备份</h1>
          <p className="text-dark-400 mt-1">管理数据库备份文件，支持创建、下载和删除。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {creating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            创建备份
          </button>
          <button onClick={loadData} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* 数据库状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <p className="text-sm text-dark-500">数据库大小</p>
              <p className="text-2xl font-bold text-dark-100">{formatSize(dbStats?.dbSize || data?.dbSize || 0)}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Table2 size={20} />
            </div>
            <div>
              <p className="text-sm text-dark-500">数据表</p>
              <p className="text-2xl font-bold text-dark-100">{dbStats?.tables.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HardDrive size={20} />
            </div>
            <div>
              <p className="text-sm text-dark-500">备份总大小</p>
              <p className="text-2xl font-bold text-dark-100">{formatSize(data?.totalSize || 0)}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm text-dark-500">备份数量</p>
              <p className="text-2xl font-bold text-dark-100">{data?.list.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 各表行数 */}
      {dbStats && dbStats.tables.length > 0 && (
        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold text-dark-100 mb-3">数据表概览</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {dbStats.tables.map((t) => (
              <div key={t.name} className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
                <p className="text-xs text-dark-500 truncate">{t.name}</p>
                <p className="text-base font-semibold text-dark-100 mt-1">{t.rows.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 备份列表 */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold text-dark-100 mb-4">备份文件</h2>
        {loading && <div className="py-12 text-center text-dark-500">加载中...</div>}
        {!loading && data?.list.length === 0 && (
          <div className="py-12 text-center">
            <Database size={48} className="mx-auto text-dark-600 mb-3" />
            <p className="text-dark-500">暂无备份文件</p>
            <p className="text-sm text-dark-600 mt-1">点击"创建备份"按钮创建第一个备份</p>
          </div>
        )}
        {!loading && data && data.list.length > 0 && (
          <div className="space-y-3">
            {data.list.map((backup) => (
              <div key={backup.filename} className="flex items-center justify-between gap-4 rounded-xl bg-dark-900/40 border border-purple-500/10 p-4 hover:border-purple-500/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <Database size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate">{backup.filename}</p>
                    <div className="flex items-center gap-3 text-xs text-dark-500">
                      <span>{formatSize(backup.size)}</span>
                      <span>{backup.createdAt}</span>
                      {backup.isAuto && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">自动</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleDownload(backup.filename)} className="p-2 rounded-lg hover:bg-emerald-500/10 text-dark-400 hover:text-emerald-400" title="下载">
                    <Download size={16} />
                  </button>
                  <button onClick={() => handleDelete(backup)} className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400" title="删除">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 安全提示 */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-dark-400 space-y-1">
            <p className="font-medium text-dark-300">注意事项</p>
            <p>备份文件存储在服务器 data/backups 目录下，为 SQLite 数据库文件副本。</p>
            <p>建议定期创建备份，特别是在执行批量操作或数据迁移前。</p>
            <p>删除备份文件后不可恢复，请谨慎操作。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
