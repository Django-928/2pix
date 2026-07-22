import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Plus,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface Transaction {
  id: number;
  user_id: number;
  username: string;
  email: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  related_id: string;
  created_at: string;
}

interface TransactionListData {
  list: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total_count: number;
    total_income: number;
    total_expense: number;
  };
}

export default function AdminBillingPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'transactions' | 'usage'>('transactions');
  const [transactions, setTransactions] = useState<TransactionListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeForm, setRechargeForm] = useState({
    user_id: '',
    amount: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
    // 交易列表按筛选条件刷新，loadTransactions 保持为当前闭包即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, typeFilter, startDate, endDate]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (typeFilter) params.append('type', typeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await api.get<TransactionListData>(
        `/admin/billing/transactions?${params.toString()}`
      );
      setTransactions(data);
    } catch {
      toast.error('加载交易记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/billing/recharge', {
        user_id: parseInt(rechargeForm.user_id),
        amount: parseFloat(rechargeForm.amount),
        description: rechargeForm.description,
      });
      setShowRechargeModal(false);
      setRechargeForm({ user_id: '', amount: '', description: '' });
      loadTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '充值失败');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = transactions ? Math.ceil(transactions.total / pageSize) : 1;

  const transactionTypes = [
    { value: '', label: '全部类型' },
    { value: 'recharge', label: '用户充值' },
    { value: 'admin_recharge', label: '管理员充值' },
    { value: 'consume', label: '消费扣费' },
    { value: 'usage', label: '消费扣费' },
    { value: 'refund', label: '退款' },
  ];

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      recharge: '用户充值',
      admin_recharge: '管理员充值',
      consume: '消费扣费',
      usage: '消费扣费',
      refund: '退款',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-400';
    }
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">计费账单</h1>
          <p className="text-dark-400 mt-1">管理平台交易记录与账单</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 hover:bg-purple-500/10 transition-colors">
            <Download size={18} />
            导出
          </button>
          <button
            onClick={() => setShowRechargeModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            <Plus size={18} />
            手动充值
          </button>
        </div>
      </div>

      {transactions?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp size={22} className="text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-400">
              ¥{transactions.stats.total_income?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-dark-500 mt-1">总收入</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingDown size={22} className="text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-400">
              ¥{Math.abs(transactions.stats.total_expense || 0).toFixed(2)}
            </p>
            <p className="text-sm text-dark-500 mt-1">总支出</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <DollarSign size={22} className="text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              ¥{((transactions.stats.total_income || 0) + (transactions.stats.total_expense || 0)).toFixed(2)}
            </p>
            <p className="text-sm text-dark-500 mt-1">净收入</p>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5 border-b border-purple-500/10 pb-4">
          <button
            onClick={() => {
              setActiveTab('transactions');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            交易记录
          </button>
          <button
            onClick={() => {
              setActiveTab('usage');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'usage'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            用量统计
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户、订单号..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-dark-500" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            >
              {transactionTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            />
            <span className="text-dark-500">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            />
          </div>
          <button
            onClick={loadTransactions}
            aria-label="刷新账单"
            className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                  <th className="pb-3 px-5 font-medium">用户</th>
                  <th className="pb-3 px-5 font-medium">类型</th>
                  <th className="pb-3 px-5 font-medium">金额</th>
                  <th className="pb-3 px-5 font-medium">变动后余额</th>
                  <th className="pb-3 px-5 font-medium">描述</th>
                  <th className="pb-3 px-5 font-medium">时间</th>
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
                {!loading && transactions?.list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-dark-500">
                      暂无交易记录
                    </td>
                  </tr>
                )}
                {!loading &&
                  transactions?.list.map((tx) => (
                    <tr key={tx.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center text-white text-sm font-medium">
                            {tx.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-dark-100 text-sm">{tx.username}</p>
                            <p className="text-xs text-dark-500">{tx.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-dark-700/50 text-dark-300 border border-dark-600">
                          {getTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`font-semibold ${getTypeColor(tx.type, tx.amount)}`}>
                          {tx.amount > 0 ? '+' : ''}
                          ¥{tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-dark-300">¥{tx.balance_after.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm text-dark-400 max-w-xs truncate">{tx.description}</p>
                      </td>
                      <td className="py-4 px-5 text-dark-400 text-sm">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="py-12 text-center text-dark-500">
            <Activity size={48} className="mx-auto mb-4 opacity-50" />
            <p>用量统计功能开发中...</p>
          </div>
        )}

        {transactions && transactions.total > pageSize && (
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-purple-500/10">
            <p className="text-sm text-dark-400">
              共 {transactions.total} 条记录，第 {page} / {totalPages} 页
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

      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">手动充值</h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecharge} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">用户ID *</label>
                <input
                  type="number"
                  value={rechargeForm.user_id}
                  onChange={(e) => setRechargeForm({ ...rechargeForm, user_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  required
                  placeholder="请输入用户ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">充值金额 *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    ¥
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rechargeForm.amount}
                    onChange={(e) => setRechargeForm({ ...rechargeForm, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">备注说明</label>
                <textarea
                  value={rechargeForm.description}
                  onChange={(e) =>
                    setRechargeForm({ ...rechargeForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors resize-none"
                  rows={2}
                  placeholder="选填，充值说明"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(false)}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !rechargeForm.user_id || !rechargeForm.amount}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  确认充值
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
