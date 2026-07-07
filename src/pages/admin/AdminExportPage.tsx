import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Upload, Users, CreditCard, FileText, Code2, BarChart3, History, Database } from 'lucide-react';
import api from '@/utils/api';

interface ExportStats {
  users_count: number;
  orders_count: number;
  works_count: number;
  usage_count: number;
  transactions_count: number;
  logs_count: number;
}

interface ExportCard {
  id: string;
  label: string;
  desc: string;
  icon: typeof Download;
  endpoint: string;
  color: string;
  permission: string;
}

const EXPORT_CARDS: ExportCard[] = [
  { id: 'users', label: '用户列表', desc: '导出全部用户信息、角色、余额等', icon: Users, endpoint: '/admin/ie/users/export', color: 'bg-purple-500/20 text-purple-400', permission: 'user:view' },
  { id: 'orders', label: '订单列表', desc: '导出充值订单、状态、支付信息', icon: CreditCard, endpoint: '/admin/ie/orders/export', color: 'bg-emerald-500/20 text-emerald-400', permission: 'billing:view' },
  { id: 'transactions', label: '交易记录', desc: '导出积分流水、充值/消费/奖励等', icon: BarChart3, endpoint: '/admin/ie/transactions/export', color: 'bg-cyan-500/20 text-cyan-400', permission: 'billing:view' },
  { id: 'usage', label: '模型调用', desc: '导出 API 调用记录、Token 用量', icon: Code2, endpoint: '/admin/ie/usage/export', color: 'bg-pink-500/20 text-pink-400', permission: 'billing:view' },
  { id: 'works', label: '作品列表', desc: '导出用户作品、审核状态、模型信息', icon: FileText, endpoint: '/admin/ie/works/export', color: 'bg-amber-500/20 text-amber-400', permission: 'system:config' },
  { id: 'logs', label: '操作日志', desc: '导出管理员操作记录、审计日志', icon: History, endpoint: '/admin/ie/logs/export', color: 'bg-blue-500/20 text-blue-400', permission: 'log:view' },
];

export default function AdminExportPage() {
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('xlsx');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ExportStats>('/admin/ie/export-info');
      setStats(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats().catch(() => undefined);
  }, [loadStats]);

  const buildExportUrl = (endpoint: string) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return `${endpoint}?${params.toString()}`;
  };

  const handleExport = async (card: ExportCard) => {
    setExporting(card.id);
    try {
      const url = buildExportUrl(card.endpoint);
      // 获取 token
      const token = localStorage.getItem('admin_token') || '';
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: '导出失败' }));
        alert(err.error || '导出失败');
        return;
      }
      const blob = await resp.blob();
      const contentDisp = resp.headers.get('Content-Disposition') || '';
      const match = contentDisp.match(/filename="(.+?)"/);
      const filename = match?.[1] || `${card.id}_${new Date().toISOString().slice(0, 10)}.${format}`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (error) {
      alert(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(null);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const result = await api.post('/admin/ie/users/import', { file: base64 });
          const data = result as unknown as { successCount: number; failCount: number; total: number; errors: string[] };
          alert(`导入完成：成功 ${data.successCount} 条，失败 ${data.failCount} 条，共 ${data.total} 条${data.errors.length > 0 ? '\n错误：' + data.errors.join('\n') : ''}`);
          loadStats().catch(() => undefined);
        } catch (error) {
          alert(error instanceof Error ? error.message : '导入失败');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const statItems = stats ? [
    { label: '用户', value: stats.users_count, icon: Users },
    { label: '订单', value: stats.orders_count, icon: CreditCard },
    { label: '交易', value: stats.transactions_count, icon: BarChart3 },
    { label: '调用', value: stats.usage_count, icon: Code2 },
    { label: '作品', value: stats.works_count, icon: FileText },
    { label: '日志', value: stats.logs_count, icon: History },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">数据导出</h1>
          <p className="text-dark-400 mt-1">导出用户、订单、作品、账单等数据为 Excel/CSV 文件。</p>
        </div>
        <button onClick={loadStats} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          刷新统计
        </button>
      </div>

      {/* 数据概览 */}
      {statItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">{item.label}总数</p>
                    <p className="text-xl font-bold text-dark-100">{Number(item.value).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 导出设置 */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold text-dark-100 mb-4 flex items-center gap-2">
          <Database size={18} className="text-purple-400" />
          导出设置
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_auto] gap-3">
          <div>
            <label className="block text-xs text-dark-500 mb-1.5">开始日期</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1.5">结束日期</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1.5">文件格式</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="input-field">
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleImport} className="btn-secondary flex items-center gap-2">
              <Upload size={16} />
              导入用户
            </button>
          </div>
        </div>
        {startDate && endDate && (
          <p className="text-xs text-dark-500 mt-2">将导出 {startDate} 至 {endDate} 期间的数据，留空日期则导出全部。</p>
        )}
      </section>

      {/* 导出卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_CARDS.map((card) => {
          const Icon = card.icon;
          const isExporting = exporting === card.id;
          const relatedStat = stats ? (stats as unknown as Record<string, number>)[`${card.id}_count`] : 0;

          return (
            <div key={card.id} className="glass rounded-2xl p-5 hover:border-purple-500/20 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-100">{card.label}</h3>
                    <p className="text-xs text-dark-500 mt-0.5">{card.desc}</p>
                    {relatedStat > 0 && (
                      <p className="text-xs text-dark-400 mt-1">可导出 <span className="text-dark-200 font-medium">{relatedStat.toLocaleString()}</span> 条</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleExport(card)}
                  disabled={isExporting}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                  {isExporting ? '导出中...' : '导出'}
                </button>
                <button
                  onClick={() => handleExport({ ...card })}
                  disabled={isExporting}
                  className="px-3 btn-secondary flex items-center justify-center disabled:opacity-50"
                  title="导出 Excel"
                >
                  <FileSpreadsheet size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 导入说明 */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold text-dark-100 mb-3 flex items-center gap-2">
          <Upload size={18} className="text-purple-400" />
          批量导入用户
        </h2>
        <div className="text-sm text-dark-400 space-y-2">
          <p>支持上传 Excel (.xlsx) 或 CSV 文件批量创建用户。文件需包含以下列：</p>
          <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
            <code className="text-xs text-dark-300">用户名 / username, 邮箱 / email, 手机号 / phone, 昵称 / nickname, 密码 / password（可选，默认 123456）, 余额 / balance（可选）</code>
          </div>
          <p>如果用户名或邮箱已存在，该行将跳过。导入结果会显示成功/失败数量及错误明细。</p>
        </div>
      </section>
    </div>
  );
}
