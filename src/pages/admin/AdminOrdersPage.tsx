import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  X,
  XCircle,
} from 'lucide-react';
import api from '@/utils/api';

interface AdminOrder {
  id: number;
  order_no: string;
  user_id: number;
  amount: number;
  tokens: number;
  status: string;
  payment_method: string;
  payment_time?: string | null;
  expires_at?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  created_at: string;
  updated_at?: string;
  username?: string | null;
  email?: string | null;
  callback_count?: number;
  last_callback_at?: string | null;
}

interface PaymentCallback {
  id: number;
  order_no: string;
  payment_method: string;
  amount: number | null;
  verification_status: string;
  process_status: string;
  message: string;
  raw_payload: string;
  created_at: string;
}

interface OrderDetail {
  order: AdminOrder;
  user?: {
    id: number;
    username: string;
    email: string;
    balance: number;
    status: string;
  };
  callbacks: PaymentCallback[];
  transaction?: {
    id: number;
    type: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    description: string;
    created_at: string;
  };
}

interface OrderListData {
  list: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total_count: number;
    paid_count: number;
    pending_count: number;
    expired_count: number;
    closed_count: number;
    paid_amount: number;
  };
}

const statusLabels: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  expired: '已过期',
  closed: '已关闭',
};

const methodLabels: Record<string, string> = {
  mock: '模拟支付',
  alipay: '支付宝',
  wechat: '微信支付',
};

function getStatusClass(status: string) {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  if (status === 'expired') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}

function getCallbackClass(status: string) {
  if (status === 'completed') return 'text-emerald-400';
  if (status === 'duplicate_ignored') return 'text-cyan-400';
  if (status === 'rejected') return 'text-red-400';
  return 'text-yellow-400';
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<OrderListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [closeReason, setCloseReason] = useState('管理员关闭订单');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    // 订单列表按筛选条件刷新，避免把 loadData 加入依赖后重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, method, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (method) params.append('method', method);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const result = await api.get<OrderListData>(`/admin/billing/orders?${params.toString()}`);
      setData(result);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (orderNo: string) => {
    const result = await api.get<OrderDetail>(`/admin/billing/orders/${orderNo}`);
    setDetail(result);
    setCloseReason(result.order.close_reason || '管理员关闭订单');
  };

  const closeOrder = async () => {
    if (!detail) return;
    if (!confirm(`确定要关闭订单 "${detail.order.order_no}" 吗？\n关闭原因：${closeReason}`)) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/billing/orders/${detail.order.order_no}/close`, { reason: closeReason });
      await Promise.all([loadData(), openDetail(detail.order.order_no)]);
    } catch (error) {
      alert(error instanceof Error ? error.message : '关闭订单失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!detail) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0 || amount > detail.order.amount) {
      alert('退款金额必须在 0 到订单金额之间');
      return;
    }
    if (!refundReason.trim()) {
      alert('请输入退款原因');
      return;
    }
    if (!confirm(`确定为订单 "${detail.order.order_no}" 退款 ¥${amount.toFixed(2)} 吗？\n原因：${refundReason}`)) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/refunds/orders/${detail.order.id}`, {
        amount,
        reason: refundReason.trim(),
      });
      setRefundAmount('');
      setRefundReason('');
      await Promise.all([loadData(), openDetail(detail.order.order_no)]);
    } catch (error) {
      alert(error instanceof Error ? error.message : '退款失败');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">订单管理</h1>
          <p className="text-dark-400 mt-1">查看充值订单、支付状态、关联回调和到账流水</p>
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
            <ShoppingCart className="text-purple-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-dark-100">{data.stats.total_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">总订单</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <CheckCircle2 className="text-emerald-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-emerald-400">{data.stats.paid_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">已支付</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <Clock className="text-yellow-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-yellow-400">{data.stats.pending_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">待支付</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <AlertTriangle className="text-orange-400 mb-3" size={22} />
            <p className="text-2xl font-bold text-orange-400">{data.stats.expired_count || 0}</p>
            <p className="text-sm text-dark-500 mt-1">已过期</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="text-xs text-dark-500">已支付金额</p>
            <p className="text-2xl font-bold text-dark-100 mt-3">¥{Number(data.stats.paid_amount || 0).toFixed(2)}</p>
            <p className="text-sm text-dark-500 mt-1">累计到账</p>
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
              placeholder="搜索订单号、用户名、邮箱..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <Filter size={18} className="text-dark-500" />
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
          >
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已支付</option>
            <option value="expired">已过期</option>
            <option value="closed">已关闭</option>
          </select>
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
                <th className="pb-3 px-5 font-medium">用户</th>
                <th className="pb-3 px-5 font-medium">金额/积分</th>
                <th className="pb-3 px-5 font-medium">支付</th>
                <th className="pb-3 px-5 font-medium">状态</th>
                <th className="pb-3 px-5 font-medium">回调</th>
                <th className="pb-3 px-5 font-medium">时间</th>
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
                  <td colSpan={8} className="py-12 text-center text-dark-500">暂无订单</td>
                </tr>
              )}
              {!loading && data?.list.map((order) => (
                <tr key={order.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                  <td className="py-4 px-5">
                    <p className="font-medium text-dark-100">{order.order_no}</p>
                    <p className="text-xs text-dark-500">ID: {order.id}</p>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-dark-200">{order.username || '未知用户'}</p>
                    <p className="text-xs text-dark-500">{order.email || '-'}</p>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-dark-100">¥{order.amount}</p>
                    <p className="text-xs text-dark-500">{order.tokens.toLocaleString()} 积分</p>
                  </td>
                  <td className="py-4 px-5 text-dark-300">{methodLabels[order.payment_method] || order.payment_method}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusClass(order.status)}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-dark-200">{order.callback_count || 0} 条</p>
                    <p className="text-xs text-dark-500">{order.last_callback_at ? new Date(order.last_callback_at).toLocaleString() : '无回调'}</p>
                  </td>
                  <td className="py-4 px-5">
                    <p className="text-sm text-dark-300">{new Date(order.created_at).toLocaleString()}</p>
                    <p className="text-xs text-dark-500">过期：{order.expires_at ? new Date(order.expires_at).toLocaleString() : '-'}</p>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => openDetail(order.order_no)}
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
          <div className="glass rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <div>
                <h3 className="text-lg font-semibold text-dark-100">订单详情</h3>
                <p className="text-xs text-dark-500 mt-1">{detail.order.order_no}</p>
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
                  <p className="text-xs text-dark-500">订单状态</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{statusLabels[detail.order.status] || detail.order.status}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">支付金额</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">¥{detail.order.amount}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">到账积分</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{detail.order.tokens.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-4">
                  <p className="text-xs text-dark-500">回调数量</p>
                  <p className="text-lg font-semibold text-dark-100 mt-2">{detail.callbacks.length}</p>
                </div>
              </div>

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <h4 className="font-semibold text-dark-100 mb-3">订单信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p className="text-dark-400">用户：<span className="text-dark-200">{detail.user?.username || '-'} · {detail.user?.email || '-'}</span></p>
                  <p className="text-dark-400">支付方式：<span className="text-dark-200">{methodLabels[detail.order.payment_method] || detail.order.payment_method}</span></p>
                  <p className="text-dark-400">创建时间：<span className="text-dark-200">{new Date(detail.order.created_at).toLocaleString()}</span></p>
                  <p className="text-dark-400">过期时间：<span className="text-dark-200">{detail.order.expires_at ? new Date(detail.order.expires_at).toLocaleString() : '-'}</span></p>
                  <p className="text-dark-400">支付时间：<span className="text-dark-200">{detail.order.payment_time ? new Date(detail.order.payment_time).toLocaleString() : '-'}</span></p>
                  <p className="text-dark-400">关闭原因：<span className="text-dark-200">{detail.order.close_reason || '-'}</span></p>
                  <p className="text-dark-400">到账流水：<span className="text-dark-200">{detail.transaction ? `${detail.transaction.balance_before} → ${detail.transaction.balance_after}` : '-'}</span></p>
                  <p className="text-dark-400">用户余额：<span className="text-dark-200">{detail.user?.balance?.toLocaleString() || '-'}</span></p>
                </div>
              </section>

              {detail.order.status === 'pending' && (
                <section className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-red-400 mt-1" size={18} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-300">关闭未支付订单</h4>
                      <p className="text-sm text-dark-400 mt-1">关闭后该订单不能继续支付，适合处理测试单、异常单或用户主动取消。</p>
                      <div className="flex gap-3 mt-3">
                        <input
                          value={closeReason}
                          onChange={(e) => setCloseReason(e.target.value)}
                          className="flex-1 px-3 py-2 bg-dark-900/50 border border-red-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-red-500/40"
                        />
                        <button
                          onClick={closeOrder}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading ? '处理中...' : '关闭订单'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {detail.order.status === 'paid' && (
                <section className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <RotateCcw className="text-orange-400 mt-1" size={18} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-300">订单退款</h4>
                      <p className="text-sm text-dark-400 mt-1">退款会按金额比例扣除用户已到账积分，并生成退款记录。</p>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 mt-3">
                        <input
                          type="number"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder={`最大 ¥${detail.order.amount}`}
                          className="px-3 py-2 bg-dark-900/50 border border-orange-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-orange-500/40"
                        />
                        <input
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="退款原因"
                          className="px-3 py-2 bg-dark-900/50 border border-orange-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-orange-500/40"
                        />
                        <button
                          onClick={handleRefund}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {actionLoading ? '处理中...' : '确认退款'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-xl bg-dark-900/30 border border-purple-500/10 p-4">
                <h4 className="font-semibold text-dark-100 mb-3">关联回调日志</h4>
                <div className="space-y-2">
                  {detail.callbacks.length === 0 && <p className="text-sm text-dark-500">暂无回调日志</p>}
                  {detail.callbacks.map((callback) => (
                    <div key={callback.id} className="rounded-xl bg-dark-900/40 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-dark-200">
                            {methodLabels[callback.payment_method] || callback.payment_method} · 回调金额 {callback.amount ?? '-'}
                          </p>
                          <p className="text-xs text-dark-500">{new Date(callback.created_at).toLocaleString()} · {callback.message || '-'}</p>
                        </div>
                        <span className={`text-sm ${getCallbackClass(callback.process_status)}`}>{callback.process_status}</span>
                      </div>
                      <pre className="mt-2 max-h-24 overflow-auto rounded-lg bg-black/20 p-2 text-xs text-dark-500 whitespace-pre-wrap">
                        {callback.raw_payload}
                      </pre>
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
