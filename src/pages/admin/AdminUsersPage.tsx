import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  X,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  nickname: string;
  avatar: string;
  role_id: number;
  role_name: string;
  status: string;
  balance: number;
  total_tokens: number;
  used_tokens: number;
  last_login_at: string;
  last_login_ip?: string;
  created_at: string;
  total_spent?: number;
  works_count?: number;
  enabled_api_keys?: number;
  login_failures?: number;
}

interface UserListData {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserTransaction {
  id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  related_id?: string;
  created_at: string;
}

interface UserOrder {
  id: number;
  order_no: string;
  amount: number;
  tokens: number;
  status: string;
  payment_method: string;
  payment_time?: string | null;
  created_at: string;
}

interface UserUsage {
  id: number;
  model: string;
  category: string;
  cost: number;
  task_id: string;
  status: string;
  created_at: string;
}

interface UserUpdatePayload {
  email: string;
  phone: string;
  nickname: string;
  role_id: number | null;
  status: string;
  balance: number;
  password?: string;
}

interface UserDetailData {
  user: User;
  transactions: UserTransaction[];
  orders: UserOrder[];
  usage: UserUsage[];
  profile: {
    totalSpent: number;
    totalRecharge: number;
    totalRechargeTokens: number;
    totalCalls: number;
    totalWorks: number;
    apiKeys: { total: number; enabled: number | null };
    invites: { count: number; reward: number };
    checkins: { days: number; max_streak: number; reward: number };
    worksByType: { image: number | null; video: number | null; audio: number | null };
  };
  risk: {
    level: 'low' | 'medium' | 'high';
    score: number;
    loginFailure: { count: number; last_attempt: string | null; locked_until: string | null };
    recentIps: Array<{ ip_address: string | null; count: number; last_seen: string }>;
    statusLogs: Array<{ action: string; details: string; created_at: string; username: string }>;
  };
}

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<UserListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null);
  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    nickname: '',
    role_id: '',
    balance: 0,
    status: 'active',
  });
  const [adjustData, setAdjustData] = useState({ amount: 0, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    // 用户列表按分页/筛选条件刷新，避免把 loadUsers 加入依赖后触发重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const data = await api.get<UserListData>(`/admin/users?${params.toString()}`);
      setUsers(data);
    } catch {
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: '',
      nickname: '',
      role_id: '',
      balance: 0,
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      password: '',
      nickname: user.nickname || '',
      role_id: user.role_id?.toString() || '',
      balance: user.balance,
      status: user.status,
    });
    setShowEditModal(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/users', {
        ...formData,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
      });
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const updateData: UserUpdatePayload = {
        email: formData.email,
        phone: formData.phone,
        nickname: formData.nickname,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
        status: formData.status,
        balance: formData.balance,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await api.put(`/admin/users/${editingUser.id}`, updateData);
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.username}" 吗？`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const reason = newStatus === 'active'
      ? '恢复正常'
      : prompt(`请输入${newStatus === 'disabled' ? '禁用' : '封禁'}用户 "${user.username}" 的原因：`);
    if (newStatus !== 'active' && !reason?.trim()) return;
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus, reason });
      loadUsers();
      if (detail?.user.id === user.id) {
        reloadDetail().catch(() => undefined);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleOpenAdjust = (user: User) => {
    setAdjustingUser(user);
    setAdjustData({ amount: 0, reason: '' });
    setShowAdjustModal(true);
  };

  const handleOpenDetail = async (user: User) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const data = await api.get<UserDetailData>(`/admin/users/${user.id}`);
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载用户详情失败');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const reloadDetail = async () => {
    if (!detail?.user.id) return;
    const data = await api.get<UserDetailData>(`/admin/users/${detail.user.id}`);
    setDetail(data);
  };

  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    const amount = Number(adjustData.amount);
    const actionText = amount > 0 ? `增加 ${amount.toLocaleString()} 积分` : `扣除 ${Math.abs(amount).toLocaleString()} 积分`;
    if (!confirm(`确定要为 "${adjustingUser.username}" ${actionText} 吗？\n原因：${adjustData.reason || '无'}`)) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/users/${adjustingUser.id}/adjust-balance`, adjustData);
      setShowAdjustModal(false);
      loadUsers();
      if (detail?.user.id === adjustingUser.id) {
        reloadDetail().catch(() => undefined);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '调账失败');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = users ? Math.ceil(users.total / pageSize) : 1;
  const getListRisk = (user: User) => {
    const score = (user.login_failures || 0) * 10 + (user.status !== 'active' ? 20 : 0);
    if (score >= 50) return { label: '高风险', className: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (score >= 20) return { label: '需关注', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    return { label: '低风险', className: 'bg-green-500/10 text-green-400 border-green-500/20' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">用户管理</h1>
          <p className="text-dark-400 mt-1">管理平台所有用户账户</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 hover:bg-purple-500/10 transition-colors">
            <Download size={18} />
            导出
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 hover:bg-purple-500/10 transition-colors">
            <Upload size={18} />
            导入
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            <Plus size={18} />
            新建用户
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名、邮箱、昵称..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-dark-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
              <option value="banned">封禁</option>
            </select>
          </div>
          <button
            onClick={loadUsers}
            className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 px-5 font-medium">用户</th>
                <th className="pb-3 px-5 font-medium">角色</th>
                <th className="pb-3 px-5 font-medium">余额</th>
                <th className="pb-3 px-5 font-medium">运营画像</th>
                <th className="pb-3 px-5 font-medium">风险</th>
                <th className="pb-3 px-5 font-medium">状态</th>
                <th className="pb-3 px-5 font-medium">最后登录</th>
                <th className="pb-3 px-5 font-medium">注册时间</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && users?.list.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-500">
                    暂无用户数据
                  </td>
                </tr>
              )}
              {!loading && users?.list.map((user) => (
                <tr key={user.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center text-white font-medium">
                        {(user.nickname || user.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{user.nickname || user.username}</p>
                        <p className="text-sm text-dark-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {user.role_name || '普通用户'}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-semibold text-dark-200">¥{user.balance.toFixed(2)}</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="text-xs text-dark-400 space-y-1">
                      <p>消费 {Number(user.total_spent || 0).toLocaleString()} 积分</p>
                      <p>作品 {user.works_count || 0} · API {user.enabled_api_keys || 0}</p>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    {(() => {
                      const risk = getListRisk(user);
                      return (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${risk.className}`}>
                          {risk.label}
                        </span>
                      );
                    })()}
                    {(user.login_failures || 0) > 0 && (
                      <p className="mt-1 text-[11px] text-red-300">失败登录 {user.login_failures} 次</p>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : user.status === 'disabled'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {user.status === 'active' ? '正常' : user.status === 'disabled' ? '禁用' : '封禁'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-dark-400 text-sm">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '从未登录'}
                  </td>
                  <td className="py-4 px-5 text-dark-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenDetail(user)}
                        className="p-2 rounded-lg text-dark-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="详情"
                      >
                        详
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 rounded-lg text-dark-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenAdjust(user)}
                        className="p-2 rounded-lg text-dark-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="额度调账"
                      >
                        ¥
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="p-2 rounded-lg text-dark-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        title={user.status === 'active' ? '禁用' : '启用'}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users && users.total > pageSize && (
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-purple-500/10">
            <p className="text-sm text-dark-400">
              共 {users.total} 条记录，第 {page} / {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 glass rounded-lg text-sm text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page > 3) {
                    pageNum = page - 2 + i;
                  }
                  if (page > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-purple-500 text-white'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-purple-500/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 glass rounded-lg text-sm text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">
                {showCreateModal ? '新建用户' : '编辑用户'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={showCreateModal ? handleSubmitCreate : handleSubmitEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">用户名 *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                    required={showCreateModal}
                    disabled={showEditModal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">昵称</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">邮箱 *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">手机号</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">角色</label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  >
                    <option value="">普通用户</option>
                    <option value="1">管理员</option>
                    <option value="3">VIP用户</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {showCreateModal ? '密码 *' : '新密码（留空不改）'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                    required={showCreateModal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">余额</label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                >
                  <option value="active">正常</option>
                  <option value="disabled">禁用</option>
                  <option value="banned">封禁</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  {showCreateModal ? '创建' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <div>
                <h3 className="text-lg font-semibold text-dark-100">用户详情</h3>
                <p className="text-xs text-dark-500 mt-1">
                  {detail?.user ? `${detail.user.username} · ${detail.user.email}` : '加载用户账务和调用信息'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetail(null);
                }}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-dark-400">
                <RefreshCw size={18} className="animate-spin" />
                加载用户详情...
              </div>
            ) : detail ? (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4">
                    <p className="text-xs text-dark-500">当前余额</p>
                    <p className="text-2xl font-bold text-dark-100 mt-2">{detail.user.balance.toLocaleString()} 积分</p>
                  </div>
                  <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4">
                    <p className="text-xs text-dark-500">累计消费</p>
                    <p className="text-2xl font-bold text-dark-100 mt-2">{detail.profile.totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4">
                    <p className="text-xs text-dark-500">累计充值</p>
                    <p className="text-2xl font-bold text-dark-100 mt-2">¥{detail.profile.totalRecharge.toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4">
                    <p className="text-xs text-dark-500">风险评分</p>
                    <p className={`text-2xl font-bold mt-2 ${
                      detail.risk.level === 'high' ? 'text-red-400' : detail.risk.level === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    }`}>{detail.risk.score}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleOpenAdjust(detail.user)}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                  >
                    给该用户调账
                  </button>
                  <button
                    onClick={reloadDetail}
                    className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                  >
                    刷新详情
                  </button>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    detail.user.status === 'active'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : detail.user.status === 'disabled'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {detail.user.status === 'active' ? '正常' : detail.user.status}
                  </span>
                </div>

                <section className="rounded-2xl bg-dark-900/30 border border-purple-500/10 p-4">
                  <h4 className="font-semibold text-dark-100 mb-3">用户画像</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: '模型调用', value: `${detail.profile.totalCalls.toLocaleString()} 次` },
                      { label: '作品总数', value: `${detail.profile.totalWorks.toLocaleString()} 个` },
                      { label: 'API Key', value: `${detail.profile.apiKeys.enabled || 0}/${detail.profile.apiKeys.total || 0}` },
                      { label: '邀请收益', value: `${detail.profile.invites.reward.toLocaleString()} 积分` },
                      { label: '签到天数', value: `${detail.profile.checkins.days} 天` },
                      { label: '最高连续签到', value: `${detail.profile.checkins.max_streak} 天` },
                      { label: '到账积分', value: `${detail.profile.totalRechargeTokens.toLocaleString()}` },
                      { label: '邀请人数', value: `${detail.profile.invites.count} 人` },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-dark-900/40 px-3 py-3">
                        <p className="text-xs text-dark-500">{item.label}</p>
                        <p className="text-base font-semibold text-dark-100 mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { label: '图片', value: detail.profile.worksByType.image || 0 },
                      { label: '视频', value: detail.profile.worksByType.video || 0 },
                      { label: '音频', value: detail.profile.worksByType.audio || 0 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs text-dark-500 mb-1">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                        <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${detail.profile.totalWorks ? (item.value / detail.profile.totalWorks) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-dark-900/30 border border-purple-500/10 p-4">
                  <h4 className="font-semibold text-dark-100 mb-3">风控信号</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-dark-900/40 px-3 py-3">
                      <p className="text-xs text-dark-500">风险等级</p>
                      <p className={`text-lg font-semibold mt-1 ${
                        detail.risk.level === 'high' ? 'text-red-400' : detail.risk.level === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>{detail.risk.level === 'high' ? '高风险' : detail.risk.level === 'medium' ? '需关注' : '低风险'}</p>
                    </div>
                    <div className="rounded-xl bg-dark-900/40 px-3 py-3">
                      <p className="text-xs text-dark-500">失败登录</p>
                      <p className="text-lg font-semibold text-dark-100 mt-1">{detail.risk.loginFailure.count} 次</p>
                      <p className="text-xs text-dark-500 mt-1">{detail.risk.loginFailure.locked_until ? `锁定至 ${new Date(detail.risk.loginFailure.locked_until).toLocaleString()}` : '未锁定'}</p>
                    </div>
                    <div className="rounded-xl bg-dark-900/40 px-3 py-3">
                      <p className="text-xs text-dark-500">最近 IP</p>
                      <p className="text-sm text-dark-200 mt-1">{detail.risk.recentIps[0]?.ip_address || detail.user.last_login_ip || '无'}</p>
                      <p className="text-xs text-dark-500 mt-1">共 {detail.risk.recentIps.length} 个近期登录 IP</p>
                    </div>
                  </div>
                  {detail.risk.statusLogs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-dark-500">最近风控/用户操作</p>
                      {detail.risk.statusLogs.slice(0, 3).map((log, index) => (
                        <div key={`${log.created_at}-${index}`} className="rounded-xl bg-dark-900/40 px-3 py-2 text-xs text-dark-400">
                          <span className="text-dark-200">{log.action}</span>
                          <span className="mx-2">·</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                          <p className="mt-1 text-dark-500 truncate">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl bg-dark-900/30 border border-purple-500/10 p-4">
                  <h4 className="font-semibold text-dark-100 mb-3">最近额度流水</h4>
                  <div className="space-y-2">
                    {detail.transactions.length === 0 && <p className="text-sm text-dark-500">暂无流水</p>}
                    {detail.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-4 rounded-xl bg-dark-900/40 px-3 py-2">
                        <div>
                          <p className="text-sm text-dark-200">{tx.description || tx.type}</p>
                          <p className="text-xs text-dark-500">{tx.type} · {new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-dark-500">{tx.balance_before} → {tx.balance_after}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-dark-900/30 border border-purple-500/10 p-4">
                  <h4 className="font-semibold text-dark-100 mb-3">最近充值订单</h4>
                  <div className="space-y-2">
                    {detail.orders.length === 0 && <p className="text-sm text-dark-500">暂无充值订单</p>}
                    {detail.orders.map((order) => (
                      <div key={order.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_100px] gap-2 rounded-xl bg-dark-900/40 px-3 py-2 text-sm">
                        <div>
                          <p className="text-dark-200">{order.order_no}</p>
                          <p className="text-xs text-dark-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <span className="text-dark-300">¥{order.amount}</span>
                        <span className="text-dark-300">{order.tokens.toLocaleString()} 积分</span>
                        <span className={order.status === 'paid' ? 'text-emerald-400' : 'text-yellow-400'}>
                          {order.status === 'paid' ? '已到账' : order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-dark-900/30 border border-purple-500/10 p-4">
                  <h4 className="font-semibold text-dark-100 mb-3">最近模型调用</h4>
                  <div className="space-y-2">
                    {detail.usage.length === 0 && <p className="text-sm text-dark-500">暂无模型调用记录</p>}
                    {detail.usage.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_110px_100px_100px] gap-2 rounded-xl bg-dark-900/40 px-3 py-2 text-sm">
                        <div>
                          <p className="text-dark-200">{item.model}</p>
                          <p className="text-xs text-dark-500">{item.task_id || '无任务ID'} · {new Date(item.created_at).toLocaleString()}</p>
                        </div>
                        <span className="text-dark-300">{item.category}</span>
                        <span className="text-red-300">-{item.cost}</span>
                        <span className="text-dark-400">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="py-16 text-center text-dark-500">暂无详情数据</div>
            )}
          </div>
        </div>
      )}

      {showAdjustModal && adjustingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <div>
                <h3 className="text-lg font-semibold text-dark-100">额度调账</h3>
                <p className="text-xs text-dark-500 mt-1">
                  当前用户：{adjustingUser.username} · 当前余额：{adjustingUser.balance.toLocaleString()} 积分
                </p>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitAdjust} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">调账金额</label>
                <input
                  type="number"
                  value={adjustData.amount}
                  onChange={(e) => setAdjustData({ ...adjustData, amount: Number(e.target.value) })}
                  placeholder="正数增加额度，负数扣减额度"
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  required
                />
                <p className="text-xs text-dark-500 mt-2">例如：输入 1000 表示增加 1000 积分，输入 -100 表示扣减 100 积分。</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">调账原因</label>
                <textarea
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="例如：人工充值补单、活动赠送、异常消费修正"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors resize-none"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || adjustData.amount === 0 || !adjustData.reason.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  确认调账
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
