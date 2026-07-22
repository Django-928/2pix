import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Filter,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface PaymentCallback {
  id: number;
  order_no: string | null;
  payment_method: string;
  event_type: string;
  amount: number | null;
  verification_status: string;
  process_status: string;
  message: string;
  raw_payload: string;
  created_at: string;
  user_id?: number | null;
  username?: string | null;
  email?: string | null;
  order_amount?: number | null;
  tokens?: number | null;
  order_status?: string | null;
  payment_time?: string | null;
  expires_at?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
}

interface CallbackListData {
  list: PaymentCallback[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total_count: number;
    completed_count: number;
    rejected_count: number;
    duplicate_count: number;
  };
}

const methodLabels: Record<string, string> = {
  mock: '模拟支付',
  alipay: '支付宝',
  wechat: '微信支付',
};

const verificationLabels: Record<string, string> = {
  verified: '校验通过',
  invalid: '参数无效',
  signature_failed: '签名失败',
  amount_failed: '金额失败',
};

const processLabels: Record<string, string> = {
  completed: '已到账',
  rejected: '已拒绝',
  duplicate_ignored: '重复忽略',
  failed: '处理失败',
};

function formatJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw || '{}'), null, 2);
  } catch {
    return raw || '{}';
  }
}

function getProcessClass(status: string) {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'duplicate_ignored') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (status === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
}

function getVerificationClass(status: string) {
  if (status === 'verified') return 'text-emerald-400';
  if (status === 'amount_failed' || status === 'signature_failed') return 'text-red-400';
  return 'text-yellow-400';
}

export default function AdminPaymentCallbacksPage() {
  const toast = useToast();
  const [data, setData] = useState<CallbackListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [processStatus, setProcessStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detail, setDetail] = useState<PaymentCallback | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
    // 回调日志按筛选条件刷新，避免把 loadData 加入依赖后重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, method, verificationStatus, processStatus, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (method) params.append('method', method);
      if (verificationStatus) params.append('verificationStatus', verificationStatus);
      if (processStatus) params.append('processStatus', processStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const result = await api.get<CallbackListData>(`/admin/billing/payment-callbacks?${params.toString()}`);
      setData(result);
    } catch {
      toast.error('加载支付回调记录失败');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (item: PaymentCallback) => {
    try {
      const result = await api.get<PaymentCallback>(`/admin/billing/payment-callbacks/${item.id}`);
      setDetail(result);
    } catch {
      setDetail(item);
    }
  };

  const copyRawPayload = async () => {
    if (!detail) return;
    await navigator.clipboard?.writeText(formatJson(detail.raw_payload));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">支付回调日志</h1>
          <p className="text-dark-400 mt-1">查看支付通知、金额校验、签名校验和处理结果</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="glass rounded-2xl p-5">
            <Activity className="text-purple-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-dark-100">{data.stats.total_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">总回调</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <CheckCircle2 className="text-emerald-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-emerald-400">{data.stats.completed_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">已到账</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <AlertTriangle className="text-red-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-red-400">{data.stats.rejected_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">已拒绝</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <Clock className="text-cyan-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-cyan-400">{data.stats.duplicate_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">重复忽略</p>
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
              placeholder="搜索订单号、处理消息..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <Filter size={18} className="text-dark-500" />
          <select
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部支付方式</option>
            <option value="mock">模拟支付</option>
            <option value="alipay">支付宝</option>
            <option value="wechat">微信支付</option>
          </select>
          <select
            value={verificationStatus}
            onChange={(e) => {
              setPage(1);
              setVerificationStatus(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部校验状态</option>
            <option value="verified">校验通过</option>
            <option value="invalid">参数无效</option>
            <option value="signature_failed">签名失败</option>
            <option value="amount_failed">金额失败</option>
          </select>
          <select
            value={processStatus}
            onChange={(e) => {
              setPage(1);
              setProcessStatus(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部处理状态</option>
            <option value="completed">已到账</option>
            <option value="rejected">已拒绝</option>
            <option value="duplicate_ignored">重复忽略</option>
            <option value="failed">处理失败</option>
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
                <th className="pb-3 px-5 font-medium">订单</th>
                <th className="pb-3 px-5 font-medium">支付方式</th>
                <th className="pb-3 px-5 font-medium">金额</th>
                <th className="pb-3 px-5 font-medium">校验</th>
                <th className="pb-3 px-5 font-medium">处理</th>
                <th className="pb-3 px-5 font-medium">时间</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && data?.list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-500">暂无回调日志</td>
                </tr>
              )}
              {!loading && data?.list.map((item) => (
                <tr key={item.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                  <td className="py-4 px-5">
                    <p className="font-medium text-dark-100">{item.order_no || '无订单号'}</p>
                    <p className="text-xs text-dark-500">{item.username || item.email || '未关联用户'}</p>
                  </td>
                  <td className="py-4 px-5 text-dark-300">{methodLabels[item.payment_method] || item.payment_method}</td>
                  <td className="py-4 px-5">
                    <p className="text-dark-200">回调：{item.amount ?? '-'}</p>
                    <p className="text-xs text-dark-500">订单：{item.order_amount ?? '-'}</p>
                  </td>
                  <td className="py-4 px-5">
                    <span className={`text-sm ${getVerificationClass(item.verification_status)}`}>
                      {verificationLabels[item.verification_status] || item.verification_status}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getProcessClass(item.process_status)}`}>
                      {processLabels[item.process_status] || item.process_status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-sm text-dark-400">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => openDetail(item)}
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
                <h3 className="text-lg font-semibold text-dark-100">回调详情</h3>
                <p className="text-xs text-dark-500 mt-1">{detail.order_no || '无订单号'} · {new Date(detail.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">处理状态</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{processLabels[detail.process_status] || detail.process_status}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">校验状态</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{verificationLabels[detail.verification_status] || detail.verification_status}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">支付方式</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{methodLabels[detail.payment_method] || detail.payment_method}</p>
                </div>
              </div>

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <h4 className="font-semibold text-dark-100 mb-3">关联订单</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p className="text-dark-400">用户：<span className="text-dark-200">{detail.username || detail.email || '-'}</span></p>
                  <p className="text-dark-400">订单状态：<span className="text-dark-200">{detail.order_status || '-'}</span></p>
                  <p className="text-dark-400">回调金额：<span className="text-dark-200">{detail.amount ?? '-'}</span></p>
                  <p className="text-dark-400">订单金额：<span className="text-dark-200">{detail.order_amount ?? '-'}</span></p>
                  <p className="text-dark-400">到账积分：<span className="text-dark-200">{detail.tokens?.toLocaleString() || '-'}</span></p>
                  <p className="text-dark-400">支付时间：<span className="text-dark-200">{detail.payment_time ? new Date(detail.payment_time).toLocaleString() : '-'}</span></p>
                  <p className="text-dark-400">过期时间：<span className="text-dark-200">{detail.expires_at ? new Date(detail.expires_at).toLocaleString() : '-'}</span></p>
                  <p className="text-dark-400">关闭原因：<span className="text-dark-200">{detail.close_reason || '-'}</span></p>
                </div>
              </section>

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-dark-100">处理消息</h4>
                </div>
                <p className="text-sm text-dark-300">{detail.message || '-'}</p>
              </section>

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-dark-100">原始回调报文</h4>
                  <button
                    onClick={copyRawPayload}
                    className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-xs text-dark-300 hover:text-dark-100 transition-colors"
                  >
                    <Copy size={14} />
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <pre className="max-h-80 overflow-auto rounded-xl bg-black/30 p-4 text-xs text-dark-300 whitespace-pre-wrap">
                  {formatJson(detail.raw_payload)}
                </pre>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
