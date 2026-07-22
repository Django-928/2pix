import { useCallback, useEffect, useState } from 'react';
import { Filter, RefreshCw, RotateCcw, Search, XCircle } from 'lucide-react';
import api from '@/utils/api';

interface RefundRecord {
  id: number;
  order_no: string;
  username: string;
  nickname: string;
  amount: number;
  reason: string | null;
  status: string;
  processed_by_name: string | null;
  created_at: string;
}

interface ListData {
  list: RefundRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const statusMap: Record<string, { label: string; color: string }> = {
  completed: { label: '已完成', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  cancelled: { label: '已取消', color: 'text-dark-400 bg-dark-400/10 border-dark-400/20' },
};

export default function AdminRefundsPage() {
  const [data, setData] = useState<ListData>({ list: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (page = data.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(data.pageSize));
      if (status) params.set('status', status);
      if (keyword) params.set('keyword', keyword);
      const res = await api.get<ListData>(`/admin/refunds?${params.toString()}`);
      setData(res);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [data.page, data.pageSize, status, keyword]);

  useEffect(() => {
    load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-purple-400">BILLING</p>
        <h1 className="mt-2 text-2xl font-bold text-dark-100">退款管理</h1>
        <p className="mt-1 text-sm text-dark-400">查看订单退款记录，在订单管理中对已支付订单发起退款。</p>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.includes('成功') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
          {notice}
        </div>
      )}

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={16} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索订单号、用户或原因"
              className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 py-2.5 pl-9 pr-4 text-sm text-dark-200 outline-none focus:border-purple-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-dark-500" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
            >
              <option value="">全部状态</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <button
              onClick={() => load(data.page)}
              disabled={loading}
              className="rounded-xl border border-purple-500/10 bg-dark-900/50 p-2.5 text-dark-300 transition hover:bg-dark-800"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-900/40 text-dark-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">订单号</th>
              <th className="px-4 py-3 text-left font-medium">用户</th>
              <th className="px-4 py-3 text-left font-medium">退款金额</th>
              <th className="px-4 py-3 text-left font-medium">原因</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">处理人</th>
              <th className="px-4 py-3 text-left font-medium">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.list.map((item) => {
              const s = statusMap[item.status] || statusMap.completed;
              return (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-dark-200">{item.order_no}</td>
                  <td className="px-4 py-3 text-dark-200">{item.nickname || item.username}</td>
                  <td className="px-4 py-3 text-dark-200">¥{item.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-dark-300 max-w-[240px] truncate">{item.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${s.color}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-300">{item.processed_by_name || '-'}</td>
                  <td className="px-4 py-3 text-dark-400">{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
            {data.list.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-dark-500">
                  暂无退款记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-dark-400">
          <span>
            共 {data.total} 条，第 {data.page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(data.page - 1)}
              disabled={data.page <= 1 || loading}
              className="rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2 transition hover:bg-dark-800 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => load(data.page + 1)}
              disabled={data.page >= totalPages || loading}
              className="rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2 transition hover:bg-dark-800 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
