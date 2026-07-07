import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Cpu, Database, HardDrive, MemoryStick, RefreshCw, Shield, TrendingUp, Users, XCircle, Clock, FileText, CreditCard, Zap } from 'lucide-react';
import api from '@/utils/api';

interface HealthData {
  system: { uptime: number; nodeVersion: string; pid: number; memory: { rssMB: number; heapMB: number; heapTotalMB: number }; cpu: number; platform: string };
  database: { sizeMB: string; walSizeMB: string };
  today: { newUsers: number; activeUsers: number; orders: number; paidOrders: number; expiredOrders: number; works: number; completedWorks: number; failedWorks: number; consumption: number; recharge: number; errors: number };
  pending: { reviewWorks: number; violatedWorks: number; bannedUsers: number; lockedAccounts: number };
  total: { users: number; totalBalance: number };
  weeklyTrend: Array<{ date: string; consumption: number; recharge: number }>;
  weeklyUsers: Array<{ date: string; cnt: number }>;
  recentSecurity: Array<{ id: number; username: string; action: string; module: string; ip_address: string; created_at: string }>;
  abnormalOrders: Array<{ id: number; order_no: string; user_id: number; amount: number; status: string; created_at: string }>;
  failedWorks: Array<{ id: string; name: string; type: string; model: string; user_id: number; username: string; created_at: string }>;
}

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天${h}时${m}分`;
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
};

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<HealthData>('/admin/health');
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const pendingItems = data ? [
    { label: '待审核作品', value: data.pending.reviewWorks, icon: FileText, color: 'text-yellow-400' },
    { label: '违规作品', value: data.pending.violatedWorks, icon: XCircle, color: 'text-red-400' },
    { label: '封禁用户', value: data.pending.bannedUsers, icon: Shield, color: 'text-orange-400' },
    { label: '锁定账户', value: data.pending.lockedAccounts, icon: AlertTriangle, color: 'text-amber-400' },
  ] : [];

  const pendingTotal = data ? data.pending.reviewWorks + data.pending.violatedWorks + data.pending.bannedUsers + data.pending.lockedAccounts : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">系统健康监控</h1>
          <p className="text-dark-400 mt-1">实时监控服务器状态、运营指标和异常事项。</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* 系统状态 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: '运行时间', value: data ? formatUptime(data.system.uptime) : '-', icon: Clock, tone: 'bg-purple-500/20 text-purple-400' },
          { label: '内存 RSS', value: data ? `${data.system.memory.rssMB} MB` : '-', icon: MemoryStick, tone: 'bg-cyan-500/20 text-cyan-400' },
          { label: 'Heap', value: data ? `${data.system.memory.heapMB}/${data.system.memory.heapTotalMB} MB` : '-', icon: HardDrive, tone: 'bg-blue-500/20 text-blue-400' },
          { label: 'CPU 核心', value: data ? `${data.system.cpu} 核` : '-', icon: Cpu, tone: 'bg-emerald-500/20 text-emerald-400' },
          { label: '数据库', value: data ? `${data.database.sizeMB} MB` : '-', icon: Database, tone: 'bg-amber-500/20 text-amber-400' },
          { label: 'WAL', value: data ? `${data.database.walSizeMB} MB` : '-', icon: Database, tone: 'bg-pink-500/20 text-pink-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg ${item.tone} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-dark-500">{item.label}</p>
                  <p className="text-lg font-bold text-dark-100">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 今日运营概览 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: '新增用户', value: data?.today.newUsers || 0, icon: Users, tone: 'bg-purple-500/20 text-purple-400' },
          { label: '活跃用户', value: data?.today.activeUsers || 0, icon: Activity, tone: 'bg-cyan-500/20 text-cyan-400' },
          { label: '订单/已付', value: `${data?.today.orders || 0}/${data?.today.paidOrders || 0}`, icon: CreditCard, tone: 'bg-emerald-500/20 text-emerald-400' },
          { label: '消耗积分', value: data?.today.consumption || 0, icon: Zap, tone: 'bg-amber-500/20 text-amber-400' },
          { label: '生成/完成', value: `${data?.today.works || 0}/${data?.today.completedWorks || 0}`, icon: FileText, tone: 'bg-pink-500/20 text-pink-400' },
          { label: '接口错误', value: data?.today.errors || 0, icon: XCircle, tone: data && data.today.errors > 10 ? 'bg-red-500/20 text-red-400' : 'bg-red-500/20 text-red-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg ${item.tone} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-dark-500">{item.label}</p>
                  <p className="text-lg font-bold text-dark-100">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 待处理事项 + 累计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold text-dark-100 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            待处理事项 {pendingTotal > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">{pendingTotal}</span>}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {pendingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3 flex items-center gap-3">
                  <Icon size={18} className={item.color} />
                  <div>
                    <p className="text-xs text-dark-500">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold text-dark-100 mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" />
            累计数据
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
              <p className="text-xs text-dark-500">总用户</p>
              <p className="text-lg font-bold text-dark-100">{(data?.total.users || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
              <p className="text-xs text-dark-500">总余额</p>
              <p className="text-lg font-bold text-dark-100">{(data?.total.totalBalance || 0).toLocaleString()} 积分</p>
            </div>
            <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
              <p className="text-xs text-dark-500">今日充值</p>
              <p className="text-lg font-bold text-emerald-400">{(data?.today.recharge || 0).toLocaleString()} 积分</p>
            </div>
            <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
              <p className="text-xs text-dark-500">今日消耗</p>
              <p className="text-lg font-bold text-amber-400">{(data?.today.consumption || 0).toLocaleString()} 积分</p>
            </div>
          </div>
        </section>
      </div>

      {/* 7 天趋势 */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold text-dark-100 mb-4">7 天趋势</h2>
        {data && data.weeklyTrend.length > 0 && (
          <div className="space-y-3">
            {data.weeklyTrend.map((row) => {
              const maxVal = Math.max(...data.weeklyTrend.map((r) => Math.max(r.consumption, r.recharge)), 1);
              const consumptionPct = (row.consumption / maxVal) * 100;
              const rechargePct = (row.recharge / maxVal) * 100;
              const dayUsers = data.weeklyUsers.find((u) => u.date === row.date);
              return (
                <div key={row.date} className="flex items-center gap-3">
                  <span className="text-xs text-dark-400 w-20 flex-shrink-0">{row.date.slice(5)}</span>
                  {dayUsers && <span className="text-xs text-dark-500 w-12">+{dayUsers.cnt}人</span>}
                  {!dayUsers && <span className="text-xs text-dark-600 w-12">-</span>}
                  <div className="flex-1 flex gap-1">
                    <div className="flex-1 h-6 bg-dark-900/40 rounded-lg overflow-hidden">
                      <div className="h-full bg-amber-500/40 rounded-lg" style={{ width: `${consumptionPct}%` }} />
                    </div>
                    <div className="flex-1 h-6 bg-dark-900/40 rounded-lg overflow-hidden">
                      <div className="h-full bg-emerald-500/40 rounded-lg" style={{ width: `${rechargePct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-dark-400 w-24 text-right">{row.consumption} / {row.recharge}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-4 mt-3 text-xs text-dark-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/40" /> 消耗积分</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/40" /> 充值积分</span>
        </div>
      </section>

      {/* 异常事件 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 失败生成 */}
        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold text-dark-100 mb-3 flex items-center gap-2">
            <XCircle size={16} className="text-red-400" />
            今日失败生成 {data?.failedWorks.length || 0}
          </h2>
          {data && data.failedWorks.length === 0 && <p className="text-sm text-dark-500">无失败生成任务</p>}
          {data?.failedWorks.map((w) => (
            <div key={w.id} className="py-2 border-b border-purple-500/5 last:border-0">
              <p className="text-sm text-dark-200 truncate">{w.name}</p>
              <p className="text-xs text-dark-500">{w.username || `用户${w.user_id}`} · {w.type} · {w.model || '-'}</p>
            </div>
          ))}
        </section>

        {/* 异常订单 */}
        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold text-dark-100 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            今日异常订单 {data?.abnormalOrders.length || 0}
          </h2>
          {data && data.abnormalOrders.length === 0 && <p className="text-sm text-dark-500">无异常订单</p>}
          {data?.abnormalOrders.map((o) => (
            <div key={o.id} className="py-2 border-b border-purple-500/5 last:border-0">
              <p className="text-sm text-dark-200 font-mono">{o.order_no}</p>
              <p className="text-xs text-dark-500">{o.amount} 积分 · {o.status === 'expired' ? '已过期' : '已关闭'}</p>
            </div>
          ))}
        </section>

        {/* 安全事件 */}
        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold text-dark-100 mb-3 flex items-center gap-2">
            <Shield size={16} className="text-purple-400" />
            近期安全事件
          </h2>
          {data && data.recentSecurity.length === 0 && <p className="text-sm text-dark-500">无安全事件</p>}
          {data?.recentSecurity.map((e) => (
            <div key={e.id} className="py-2 border-b border-purple-500/5 last:border-0">
              <p className="text-sm text-dark-200">{e.action}</p>
              <p className="text-xs text-dark-500">{e.username || '-'} · {e.ip_address || '-'}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
