import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import api from '@/utils/api';

interface UsageRecord {
  id: number;
  user_id: number;
  username: string;
  email: string;
  model: string;
  category: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  task_id: string;
  status: string;
  created_at: string;
  balance?: number;
  user_status?: string;
}

interface UsageTransaction {
  id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  related_id: string;
  created_at: string;
}

interface UsageListData {
  list: UsageRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total_calls: number;
    completed_calls: number;
    failed_calls: number;
    refunded_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost: number;
    avg_cost: number;
  };
}

interface UsageDetailData {
  usage: UsageRecord;
  transactions: UsageTransaction[];
}

const categoryLabels: Record<string, string> = {
  chat: '聊天',
  image: '图片',
  video: '视频',
  audio: '音频',
  canvas: '画布',
};

const statusLabels: Record<string, string> = {
  completed: '已完成',
  failed: '失败',
  refunded: '已退款',
  pending: '处理中',
};

function getStatusClass(status: string) {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'refunded') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (status === 'failed') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
}

function formatNumber(value?: number) {
  return Number(value || 0).toLocaleString();
}

export default function AdminModelUsagePage() {
  const [data, setData] = useState<UsageListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detail, setDetail] = useState<UsageDetailData | null>(null);

  useEffect(() => {
    loadData();
    // 模型调用列表按筛选条件刷新，避免把 loadData 加入依赖后重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, model, category, status, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (model) params.append('model', model);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const result = await api.get<UsageListData>(`/admin/billing/usage?${params.toString()}`);
      setData(result);
    } catch (error) {
      console.error('Failed to load model usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    const result = await api.get<UsageDetailData>(`/admin/billing/usage/${id}`);
    setDetail(result);
  };

  const models = useMemo(() => {
    const set = new Set<string>();
    data?.list.forEach((item) => set.add(item.model));
    return Array.from(set);
  }, [data]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;
  const completed = data?.stats.completed_calls || 0;
  const total = data?.stats.total_calls || 0;
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">模型调用</h1>
          <p className="text-dark-400 mt-1">排查用户模型调用、任务 ID、扣费流水和失败退款记录</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          <div className="glass rounded-2xl p-5">
            <Activity className="text-purple-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-dark-100">{formatNumber(data.stats.total_calls)}</p>
            <p className="text-sm text-dark-500 mt-1">总调用</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <CheckCircle2 className="text-emerald-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-emerald-400">{successRate.toFixed(1)}%</p>
            <p className="text-sm text-dark-500 mt-1">成功率</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <AlertTriangle className="text-red-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-red-400">{formatNumber(data.stats.failed_calls)}</p>
            <p className="text-sm text-dark-500 mt-1">失败调用</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <RotateCcw className="text-cyan-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-cyan-400">{formatNumber(data.stats.refunded_calls)}</p>
            <p className="text-sm text-dark-500 mt-1">已退款</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <Cpu className="text-yellow-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-dark-100">{formatNumber(data.stats.total_cost)}</p>
            <p className="text-sm text-dark-500 mt-1">总消耗积分</p>
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
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="搜索用户名、邮箱、模型、任务ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <Filter size={18} className="text-dark-500" />
          <select
            value={model}
            onChange={(e) => {
              setPage(1);
              setModel(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部模型</option>
            {models.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部类型</option>
            <option value="chat">聊天</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
            <option value="canvas">画布</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部状态</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="refunded">已退款</option>
            <option value="pending">处理中</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          />
        </div>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 px-5 font-medium">用户</th>
                <th className="pb-3 px-5 font-medium">模型</th>
                <th className="pb-3 px-5 font-medium">类型</th>
                <th className="pb-3 px-5 font-medium">Token</th>
                <th className="pb-3 px-5 font-medium">消耗</th>
                <th className="pb-3 px-5 font-medium">状态</th>
                <th className="pb-3 px-5 font-medium">任务</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && data?.list.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-500">暂无调用记录</td>
                </tr>
              )}
              {!loading && data?.list.map((item) => (
                <tr key={item.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                  <td className="py-4 px-5">
                    <p className="text-dark-100">{item.username}</p>
                    <p className="text-xs text-dark-500">{item.email}</p>
                  </td>
                  <td className="py-4 px-5">
                    <p className="font-medium text-dark-100">{item.model}</p>
                    <p className="text-xs text-dark-500">ID: {item.id}</p>
                  </td>
                  <td className="py-4 px-5 text-dark-300">{categoryLabels[item.category] || item.category}</td>
                  <td className="py-4 px-5">
                    <p className="text-dark-200">输入 {formatNumber(item.input_tokens)}</p>
                    <p className="text-xs text-dark-500">输出 {formatNumber(item.output_tokens)}</p>
                  </td>
                  <td className="py-4 px-5 text-red-300">-{formatNumber(item.cost)}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusClass(item.status)}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <p className="max-w-44 truncate text-sm text-dark-300">{item.task_id || '-'}</p>
                    <p className="text-xs text-dark-500">{new Date(item.created_at).toLocaleString()}</p>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => openDetail(item.id)}
                      className="p-2 rounded-lg text-dark-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                      title="查看详情"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.total > pageSize && (
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-purple-500/10">
            <p className="text-sm text-dark-400">共 {data.total} 条记录，第 {page} / {totalPages} 页</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 glass rounded-lg text-sm text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 glass rounded-lg text-sm text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <div>
                <h3 className="text-lg font-semibold text-dark-100">调用详情</h3>
                <p className="text-xs text-dark-500 mt-1">{detail.usage.model} · {detail.usage.task_id || '无任务ID'}</p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">调用状态</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{statusLabels[detail.usage.status] || detail.usage.status}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">消耗积分</p>
                  <p className="text-lg font-semibold text-red-300 mt-2">-{formatNumber(detail.usage.cost)}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">输入 Token</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{formatNumber(detail.usage.input_tokens)}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">输出 Token</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{formatNumber(detail.usage.output_tokens)}</p>
                </div>
              </div>

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <h4 className="font-semibold text-dark-100 mb-3">调用信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p className="text-dark-400">用户：<span className="text-dark-200">{detail.usage.username} · {detail.usage.email}</span></p>
                  <p className="text-dark-400">用户余额：<span className="text-dark-200">{formatNumber(detail.usage.balance)}</span></p>
                  <p className="text-dark-400">模型：<span className="text-dark-200">{detail.usage.model}</span></p>
                  <p className="text-dark-400">类型：<span className="text-dark-200">{categoryLabels[detail.usage.category] || detail.usage.category}</span></p>
                  <p className="text-dark-400">任务 ID：<span className="text-dark-200">{detail.usage.task_id || '-'}</span></p>
                  <p className="text-dark-400">创建时间：<span className="text-dark-200">{new Date(detail.usage.created_at).toLocaleString()}</span></p>
                </div>
              </section>

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <h4 className="font-semibold text-dark-100 mb-3">关联流水</h4>
                <div className="space-y-2">
                  {detail.transactions.length === 0 && <p className="text-sm text-dark-500">暂无关联流水</p>}
                  {detail.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 rounded-xl bg-dark-900/40 px-3 py-2">
                      <div>
                        <p className="text-sm text-dark-200">{tx.description || tx.type}</p>
                        <p className="text-xs text-dark-500">{new Date(tx.created_at).toLocaleString()} · {tx.related_id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)}
                        </p>
                        <p className="text-xs text-dark-500">{tx.balance_before} → {tx.balance_after}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
