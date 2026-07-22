import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Activity,
  Info,
  X,
} from 'lucide-react';
import api from '@/utils/api';

interface OperationLog {
  id: number;
  user_id: number;
  username: string;
  user_avatar: string;
  action: string;
  module: string;
  ip_address: string;
  user_agent: string;
  details: string;
  created_at: string;
}

interface LogListData {
  list: OperationLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface LogStats {
  todayCount: number;
  moduleStats: { module: string; count: number }[];
  actionStats: { action: string; count: number }[];
  security: {
    todaySecurity: number;
    loginFailures: number;
    lockedAccounts: number;
    sensitiveChanges: number;
    abnormalCallbacks: number;
    events: OperationLog[];
    topRiskIps: Array<{ ip_address: string; count: number; last_seen: string }>;
  };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogListData | null>(null);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [securityOnly, setSecurityOnly] = useState(false);
  const [detailLog, setDetailLog] = useState<OperationLog | null>(null);

  useEffect(() => {
    loadData();
    // 日志列表按筛选条件刷新，避免把 loadData 加入依赖后触发重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, moduleFilter, actionFilter, startDate, endDate, securityOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (securityOnly) params.append('security', '1');

      const [logsData, statsData] = await Promise.all([
        api.get<LogListData>(`/admin/logs?${params.toString()}`),
        api.get<LogStats>('/admin/logs/stats/summary'),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (log: OperationLog) => {
    try {
      const detail = await api.get<OperationLog>(`/admin/logs/${log.id}`);
      setDetailLog(detail);
    } catch {
      setDetailLog(log);
    }
  };

  const totalPages = logs ? Math.ceil(logs.total / pageSize) : 1;

  const modules = ['auth', 'user', 'role', 'billing', 'log', 'system', 'api_key', 'account', 'work'];
  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      auth: '认证',
      user: '用户',
      role: '角色',
      billing: '计费',
      log: '日志',
      system: '系统',
      api_key: 'API Key',
      account: '账户',
      work: '作品',
    };
    return labels[module] || module;
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('update')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (action.startsWith('create')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.startsWith('delete')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (action.includes('close')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (action.includes('recharge')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    const colors: Record<string, string> = {
      login: 'bg-green-500/10 text-green-400 border-green-500/20',
      logout: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      create: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      update: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      delete: 'bg-red-500/10 text-red-400 border-red-500/20',
      view: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      export: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      import: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    };
    return colors[action] || 'bg-dark-700 text-dark-400 border-dark-600';
  };

  const isSecurityEvent = (log: OperationLog) => (
    ['login_failed', 'account_locked', 'change_password', 'update_user_status', 'adjust_balance', 'delete_user', 'update_config', 'create_api_key', 'update_api_key', 'delete_api_key', 'deactivate_account'].includes(log.action)
    || ['auth', 'user', 'system', 'billing', 'api_key'].includes(log.module)
  );

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  const renderDetails = (details: string) => {
    const parsed = parseDetails(details);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const detailObj = parsed as {
        key?: string;
        changedFields?: number;
        diff?: Array<{ path: string; before: unknown; after: unknown }>;
      };
      if (Array.isArray(detailObj.diff)) {
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {detailObj.key && <span className="rounded-lg bg-purple-500/10 px-2 py-1 text-purple-300">配置：{detailObj.key}</span>}
              <span className="rounded-lg bg-cyan-500/10 px-2 py-1 text-cyan-300">变更字段：{detailObj.changedFields || detailObj.diff.length}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-purple-500/10">
              <table className="w-full text-xs">
                <thead className="bg-dark-900/60 text-dark-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">字段</th>
                    <th className="px-3 py-2 text-left font-medium">修改前</th>
                    <th className="px-3 py-2 text-left font-medium">修改后</th>
                  </tr>
                </thead>
                <tbody>
                  {detailObj.diff.map((item, index) => (
                    <tr key={`${item.path}-${index}`} className="border-t border-purple-500/5">
                      <td className="px-3 py-2 text-purple-300">{item.path}</td>
                      <td className="px-3 py-2 text-dark-400 break-all">{String(item.before ?? '-')}</td>
                      <td className="px-3 py-2 text-dark-200 break-all">{String(item.after ?? '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    }

    return (
      <pre className="text-xs text-dark-300 whitespace-pre-wrap break-all">
        {typeof parsed === 'string' ? details : JSON.stringify(parsed, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">操作日志</h1>
          <p className="text-dark-400 mt-1">查看系统所有操作记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 hover:bg-purple-500/10 transition-colors">
            <Download size={18} />
            导出
          </button>
          <button
            onClick={loadData}
            aria-label="刷新日志"
            className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {[
              { label: '今日操作', value: stats.todayCount, icon: Activity, tone: 'bg-purple-500/20 text-purple-400' },
              { label: '操作模块', value: stats.moduleStats?.length || 0, icon: FileText, tone: 'bg-cyan-500/20 text-cyan-400' },
              { label: '总记录数', value: logs?.total || 0, icon: Info, tone: 'bg-pink-500/20 text-pink-400' },
              { label: '今日安全事件', value: stats.security.todaySecurity, icon: Info, tone: 'bg-red-500/20 text-red-400' },
              { label: '7日登录失败', value: stats.security.loginFailures, icon: Activity, tone: 'bg-yellow-500/20 text-yellow-400' },
              { label: '锁定账户', value: stats.security.lockedAccounts, icon: FileText, tone: 'bg-orange-500/20 text-orange-400' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.tone} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-dark-100">{Number(item.value || 0).toLocaleString()}</p>
                      <p className="text-sm text-dark-500">{item.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-dark-100 mb-4">安全概览</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
                  <p className="text-xs text-dark-500">敏感操作</p>
                  <p className="text-xl font-bold text-dark-100 mt-1">{stats.security.sensitiveChanges}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
                  <p className="text-xs text-dark-500">异常支付回调</p>
                  <p className="text-xl font-bold text-dark-100 mt-1">{stats.security.abnormalCallbacks}</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-dark-100 mb-4">高频风险 IP</h3>
              <div className="space-y-2">
                {stats.security.topRiskIps.length === 0 && <p className="text-sm text-dark-500">暂无风险 IP</p>}
                {stats.security.topRiskIps.slice(0, 4).map((item) => (
                  <div key={item.ip_address} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-dark-300">{item.ip_address}</span>
                    <span className="text-red-300">{item.count} 次</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-dark-100 mb-4">最近安全事件</h3>
              <div className="space-y-2">
                {stats.security.events.length === 0 && <p className="text-sm text-dark-500">暂无安全事件</p>}
                {stats.security.events.slice(0, 4).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => viewDetail(event)}
                    className="w-full text-left rounded-xl bg-dark-900/40 hover:bg-purple-500/10 px-3 py-2 transition-colors"
                  >
                    <p className="text-sm text-dark-200">{event.action}</p>
                    <p className="text-xs text-dark-500">{event.username || 'system'} · {new Date(event.created_at).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名、操作详情..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-dark-500" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            >
              <option value="">全部模块</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {getModuleLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setPage(1);
              setSecurityOnly((prev) => !prev);
            }}
            className={`px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              securityOnly
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : 'bg-dark-900/50 text-dark-300 border-purple-500/10 hover:border-purple-500/30'
            }`}
          >
            只看安全事件
          </button>
          <select
            value={actionFilter}
            onChange={(e) => {
              setPage(1);
              setActionFilter(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部动作</option>
            {stats?.actionStats?.map((item) => (
              <option key={item.action} value={item.action}>
                {item.action}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-dark-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            />
            <span className="text-dark-500">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 px-5 font-medium">用户</th>
                <th className="pb-3 px-5 font-medium">模块</th>
                <th className="pb-3 px-5 font-medium">操作</th>
                <th className="pb-3 px-5 font-medium">IP地址</th>
                <th className="pb-3 px-5 font-medium">操作时间</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-dark-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && logs?.list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-dark-500">
                    暂无日志记录
                  </td>
                </tr>
              )}
              {!loading &&
                logs?.list.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-purple-500/5 hover:bg-purple-500/5 ${isSecurityEvent(log) ? 'bg-red-500/[0.03]' : ''}`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center text-white text-sm font-medium">
                          {(log.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-dark-100 text-sm">{log.username || 'system'}</p>
                          <p className="text-xs text-dark-500">UID: {log.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-dark-700/50 text-dark-300 border border-dark-600">
                        {getModuleLabel(log.module)}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      {isSecurityEvent(log) && (
                        <span className="ml-2 px-2 py-1 rounded-full text-[11px] bg-red-500/10 text-red-300 border border-red-500/20">
                          安全
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-dark-400 text-sm font-mono">
                      {log.ip_address}
                    </td>
                    <td className="py-4 px-5 text-dark-400 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => viewDetail(log)}
                          className="px-3 py-1.5 rounded-lg text-xs text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          详情
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {logs && logs.total > pageSize && (
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-purple-500/10">
            <p className="text-sm text-dark-400">
              共 {logs.total} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 glass rounded-lg text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-dark-400 min-w-20 text-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 glass rounded-lg text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">日志详情</h3>
              <button
                onClick={() => setDetailLog(null)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 mb-1">日志ID</p>
                  <p className="text-sm text-dark-200 font-mono">#{detailLog.id}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-1">操作时间</p>
                  <p className="text-sm text-dark-200">
                    {new Date(detailLog.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 mb-1">操作用户</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center text-white text-xs">
                      {(detailLog.username || 'S').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-dark-200">{detailLog.username || 'system'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-1">IP地址</p>
                  <p className="text-sm text-dark-200 font-mono">{detailLog.ip_address}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 mb-1">模块</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-dark-700/50 text-dark-300 border border-dark-600">
                    {getModuleLabel(detailLog.module)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-1">操作</p>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(
                      detailLog.action
                    )}`}
                  >
                    {detailLog.action}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">User-Agent</p>
                <p className="text-sm text-dark-400 break-all">{detailLog.user_agent}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">操作详情</p>
                <div className="p-3 bg-dark-900/50 rounded-xl border border-purple-500/10">
                  {renderDetails(detailLog.details)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
