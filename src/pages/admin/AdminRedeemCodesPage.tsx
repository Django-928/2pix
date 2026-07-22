import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react';
import api from '@/utils/api';

interface RedeemCode {
  id: number;
  code: string;
  tokens: number;
  status: 'active' | 'used' | 'expired' | 'disabled';
  total_usage: number;
  used_count: number;
  valid_start: string | null;
  valid_end: string | null;
  description: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface RedeemRecord {
  id: number;
  code: string;
  username: string;
  nickname: string;
  tokens: number;
  before_balance: number;
  after_balance: number;
  created_at: string;
}

interface ListData {
  list: RedeemCode[];
  total: number;
  page: number;
  pageSize: number;
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: '有效', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle2 size={14} /> },
  used: { label: '已用完', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: <Ticket size={14} /> },
  expired: { label: '已过期', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <AlertTriangle size={14} /> },
  disabled: { label: '已禁用', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: <XCircle size={14} /> },
};

export default function AdminRedeemCodesPage() {
  const [data, setData] = useState<ListData>({ list: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    count: 10,
    tokens: 100,
    totalUsage: 1,
    validStart: '',
    validEnd: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);
  const [createdCodes, setCreatedCodes] = useState<RedeemCode[]>([]);

  const [detailCode, setDetailCode] = useState<RedeemCode | null>(null);
  const [records, setRecords] = useState<RedeemRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const load = useCallback(async (page = data.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(data.pageSize));
      if (status) params.set('status', status);
      if (keyword) params.set('keyword', keyword);
      const res = await api.get<ListData>(`/admin/redeem-codes?${params.toString()}`);
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

  const handleCreate = async () => {
    setCreating(true);
    setNotice('');
    try {
      const res = await api.post<{ list: RedeemCode[] }>('/admin/redeem-codes', {
        count: createForm.count,
        tokens: createForm.tokens,
        totalUsage: createForm.totalUsage,
        validStart: createForm.validStart || undefined,
        validEnd: createForm.validEnd || undefined,
        description: createForm.description || undefined,
      });
      setCreatedCodes(res.list);
      await load(1);
      setNotice(`成功生成 ${res.list.length} 个兑换码`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '生成失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该兑换码？已兑换记录仍会保留。')) return;
    try {
      await api.delete(`/admin/redeem-codes/${id}`);
      await load(data.page);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleToggleStatus = async (item: RedeemCode) => {
    const next = item.status === 'disabled' ? 'active' : 'disabled';
    try {
      await api.put(`/admin/redeem-codes/${item.id}`, { status: next });
      await load(data.page);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '操作失败');
    }
  };

  const loadRecords = async (code: RedeemCode) => {
    setDetailCode(code);
    setRecordsLoading(true);
    try {
      const res = await api.get<{ list: RedeemRecord[] }>(`/admin/redeem-codes/${code.id}/records`);
      setRecords(res.list);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '加载记录失败');
    } finally {
      setRecordsLoading(false);
    }
  };

  const copyCodes = () => {
    const text = createdCodes.map((c) => c.code).join('\n');
    navigator.clipboard.writeText(text).then(() => setNotice('已复制到剪贴板'));
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-purple-400">OPERATIONS</p>
          <h1 className="mt-2 text-2xl font-bold text-dark-100">兑换码管理</h1>
          <p className="mt-1 text-sm text-dark-400">生成、管理积分兑换码，查看兑换记录。</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400"
        >
          <Plus size={16} />
          生成兑换码
        </button>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.includes('成功') || notice.includes('已复制') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
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
              placeholder="搜索兑换码或描述"
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
              <option value="active">有效</option>
              <option value="used">已用完</option>
              <option value="expired">已过期</option>
              <option value="disabled">已禁用</option>
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
              <th className="px-4 py-3 text-left font-medium">兑换码</th>
              <th className="px-4 py-3 text-left font-medium">积分</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">使用次数</th>
              <th className="px-4 py-3 text-left font-medium">有效期</th>
              <th className="px-4 py-3 text-left font-medium">描述</th>
              <th className="px-4 py-3 text-left font-medium">创建时间</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.list.map((item) => {
              const s = statusMap[item.status] || statusMap.active;
              return (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-dark-200">{item.code}</td>
                  <td className="px-4 py-3 text-dark-200">{item.tokens.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${s.color}`}>
                      {s.icon}
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-300">
                    {item.used_count} / {item.total_usage}
                  </td>
                  <td className="px-4 py-3 text-dark-300">
                    {item.valid_start || item.valid_end ? (
                      <span>
                        {item.valid_start ? new Date(item.valid_start).toLocaleDateString() : '不限'} ~ {item.valid_end ? new Date(item.valid_end).toLocaleDateString() : '不限'}
                      </span>
                    ) : (
                      '永久有效'
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark-300 max-w-[200px] truncate">{item.description || '-'}</td>
                  <td className="px-4 py-3 text-dark-400">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => loadRecords(item)}
                        className="rounded-lg p-1.5 text-dark-400 transition hover:bg-dark-800 hover:text-dark-200"
                        title="兑换记录"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className="rounded-lg p-1.5 text-dark-400 transition hover:bg-dark-800 hover:text-dark-200"
                        title={item.status === 'disabled' ? '启用' : '禁用'}
                      >
                        {item.status === 'disabled' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-dark-400 transition hover:bg-red-500/10 hover:text-red-400"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.list.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-dark-500">
                  暂无兑换码
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-purple-500/10 bg-[#13131a] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">生成兑换码</h2>
              <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-dark-200">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <label className="space-y-2 text-sm text-dark-300">
                  生成数量
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={createForm.count}
                    onChange={(e) => setCreateForm({ ...createForm, count: Number(e.target.value) })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
                <label className="space-y-2 text-sm text-dark-300">
                  每个积分
                  <input
                    type="number"
                    min={1}
                    value={createForm.tokens}
                    onChange={(e) => setCreateForm({ ...createForm, tokens: Number(e.target.value) })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
                <label className="space-y-2 text-sm text-dark-300">
                  可使用次数
                  <input
                    type="number"
                    min={1}
                    value={createForm.totalUsage}
                    onChange={(e) => setCreateForm({ ...createForm, totalUsage: Number(e.target.value) })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-dark-300">
                  有效期开始
                  <input
                    type="datetime-local"
                    value={createForm.validStart}
                    onChange={(e) => setCreateForm({ ...createForm, validStart: e.target.value })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
                <label className="space-y-2 text-sm text-dark-300">
                  有效期结束
                  <input
                    type="datetime-local"
                    value={createForm.validEnd}
                    onChange={(e) => setCreateForm({ ...createForm, validEnd: e.target.value })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm text-dark-300">
                描述
                <input
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="例如：新用户专属礼包"
                  className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                />
              </label>

              {createdCodes.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-emerald-300">已生成 {createdCodes.length} 个兑换码</span>
                    <button onClick={copyCodes} className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200">
                      <Copy size={12} /> 复制全部
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={4}
                    value={createdCodes.map((c) => c.code).join('\n')}
                    className="w-full rounded-lg border border-emerald-500/10 bg-black/20 px-3 py-2 text-xs font-mono text-dark-200 outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-purple-500/10 bg-dark-900/50 px-4 py-2 text-sm text-dark-300 transition hover:bg-dark-800"
                >
                  关闭
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:opacity-50"
                >
                  {creating && <RefreshCw size={14} className="animate-spin" />}
                  生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-purple-500/10 bg-[#13131a] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-dark-100">兑换记录</h2>
                <p className="text-sm text-dark-500">{detailCode.code}</p>
              </div>
              <button onClick={() => setDetailCode(null)} className="text-dark-400 hover:text-dark-200">
                ×
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-purple-500/10">
              <table className="w-full text-sm">
                <thead className="bg-dark-900/40 text-dark-400">
                  <tr>
                    <th className="px-4 py-3 text-left">用户</th>
                    <th className="px-4 py-3 text-left">积分</th>
                    <th className="px-4 py-3 text-left">兑换前</th>
                    <th className="px-4 py-3 text-left">兑换后</th>
                    <th className="px-4 py-3 text-left">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recordsLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-dark-500">加载中...</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-dark-500">暂无兑换记录</td></tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-dark-200">{r.nickname || r.username}</td>
                        <td className="px-4 py-3 text-dark-200">+{r.tokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-dark-400">{r.before_balance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-dark-400">{r.after_balance.toLocaleString()}</td>
                        <td className="px-4 py-3 text-dark-400">{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
