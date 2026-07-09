import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  FileText,
  Gift,
  Headphones,
  Image,
  Key,
  Languages,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Music,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Ticket,
  Trash2,
  TrendingUp,
  User,
  Video,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import useSettingsStore from '@/store/useSettingsStore';
import useAuthStore from '@/store/useAuthStore';
import useAccountStore from '@/store/useAccountStore';
import AppQuickNav from '@/components/layout/AppQuickNav';
import api from '@/utils/api';

type ProfileTab = 'overview' | 'recharge' | 'records' | 'invite' | 'api' | 'settings';
type WorkFilter = 'all' | 'image' | 'video' | 'audio';

interface SecurityHistory {
  logs: Array<{
    id: number;
    action: string;
    ip_address: string;
    user_agent: string;
    details: string | null;
    created_at: string;
  }>;
  sessions: Array<{
    id: number;
    ip_address: string;
    user_agent: string;
    expires_at: string;
    created_at: string;
  }>;
}

const profileTabs: Array<{ id: ProfileTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: '个人概览', icon: User },
  { id: 'recharge', label: '在线充值', icon: CreditCard },
  { id: 'records', label: '消费记录', icon: Receipt },
  { id: 'invite', label: '邀请奖励', icon: Gift },
  { id: 'api', label: 'API 密钥', icon: Key },
  { id: 'settings', label: '账号设置', icon: Settings },
];

interface MembershipPlan {
  id: number;
  name: string;
  amount: number;
  tokens: number;
  badge: string | null;
  tone: string | null;
  description: string | null;
  sort_order: number;
  status: string;
}

interface ApiKeyItem {
  id: number;
  name: string;
  key_prefix: string;
  scope: string;
  enabled: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface CheckInStatus {
  today: string;
  checkedIn: boolean;
  reward: number;
  todayReward: number;
  streakDays: number;
  lastCheckInDate: string | null;
}

interface InviteData {
  inviteCode: string;
  inviteCount: number;
  totalReward: number;
  list: Array<{
    id: number;
    inviteeId: number;
    inviteeName: string;
    rewardAmount: number;
    createdAt: string;
  }>;
}

interface NotificationData {
  unread: number;
  list: Array<{
    id: number;
    type: string;
    title: string;
    content: string;
    readAt: string | null;
    relatedType: string | null;
    relatedId: string | null;
    createdAt: string;
  }>;
}

interface AccountStats {
  balance: number;
  monthlyConsumption: number;
  monthlyRechargeAmount: number;
  monthlyRechargeTokens: number;
  totalWorks: number;
  worksByType: {
    image: number;
    video: number;
    audio: number;
  };
  totalCalls: number;
  totalUsageCost: number;
  apiKeys: {
    total: number;
    enabled: number;
  };
  invites: {
    count: number;
    reward: number;
  };
  checkins: {
    maxStreak: number;
    totalReward: number;
  };
  trend: Array<{
    date: string;
    consumption: number;
    recharge: number;
    works: number;
    calls: number;
  }>;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [workFilter, setWorkFilter] = useState<WorkFilter>('all');
  const toast = useToast();
  const [copied, setCopied] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState('');
  const [rechargeNotice, setRechargeNotice] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [securityHistory, setSecurityHistory] = useState<SecurityHistory | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityNotice, setSecurityNotice] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateText, setDeactivateText] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ nickname: '', phone: '', avatar: '' });
  const [profileNotice, setProfileNotice] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 头像上传
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarClick = () => avatarInputRef.current?.click();
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.warning('图片大小不能超过 500KB');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.warning('仅支持 PNG、JPG、GIF、WebP 格式');
      return;
    }
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = await api.post<{ avatar: string }>('/account/avatar', { avatar: reader.result });
          refreshMe();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : '头像上传失败');
        } finally {
          setAvatarUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setAvatarUploading(false);
    }
  };

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<{ id: number; name: string; key: string } | null>(null);
  const [apiKeyNotice, setApiKeyNotice] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInNotice, setCheckInNotice] = useState('');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [notificationData, setNotificationData] = useState<NotificationData>({ unread: 0, list: [] });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const { theme, toggleTheme, language, toggleLanguage } = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const logout = useAuthStore((s) => s.logout);
  const balance = useAccountStore((s) => s.balance);
  const transactions = useAccountStore((s) => s.transactions);
  const orders = useAccountStore((s) => s.orders);
  const refreshBalance = useAccountStore((s) => s.refreshBalance);
  const loadTransactions = useAccountStore((s) => s.loadTransactions);
  const loadOrders = useAccountStore((s) => s.loadOrders);
  const createRechargeOrder = useAccountStore((s) => s.createRechargeOrder);
  const payRechargeOrder = useAccountStore((s) => s.payRechargeOrder);
  const displayName = user?.nickname || user?.username || '用户';
  const displayBalance = user?.balance ?? balance;

  const filteredProjects = useMemo(() => {
    if (workFilter === 'all') return projects;
    return projects.filter((item) => item.type === workFilter);
  }, [projects, workFilter]);

  const todayChecked = checkInStatus?.checkedIn ?? false;
  const inviteCode = inviteData?.inviteCode || user?.username || 'USER';
  const maxTrendValue = Math.max(
    1,
    ...(accountStats?.trend || []).flatMap((item) => [item.consumption, item.recharge, item.works, item.calls])
  );

  useEffect(() => {
    refreshMe();
    refreshBalance().catch(() => undefined);
    loadTransactions().catch(() => undefined);
    loadOrders().catch(() => undefined);
    loadSecurityHistory().catch(() => undefined);
    loadApiKeys().catch(() => undefined);
    loadCheckInStatus().catch(() => undefined);
    loadInviteData().catch(() => undefined);
    loadNotifications().catch(() => undefined);
    loadAccountStats().catch(() => undefined);
    loadPlans().catch(() => undefined);
  }, [refreshMe, refreshBalance, loadTransactions, loadOrders]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        nickname: user.nickname || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const loadSecurityHistory = async () => {
    const data = await api.get<SecurityHistory>('/account/security-history');
    setSecurityHistory(data);
  };

  const loadCheckInStatus = async () => {
    const data = await api.get<CheckInStatus>('/account/checkin/status');
    setCheckInStatus(data);
  };

  const handleDailyCheckIn = async () => {
    setCheckInNotice('');
    setCheckInLoading(true);
    try {
      const data = await api.post<{
        checkedIn: boolean;
        reward: number;
        streakDays: number;
        balance_after: number;
      }>('/account/checkin');
      setCheckInStatus((prev) => ({
        today: prev?.today || new Date().toISOString().slice(0, 10),
        checkedIn: true,
        reward: data.reward,
        todayReward: data.reward,
        streakDays: data.streakDays,
        lastCheckInDate: prev?.today || new Date().toISOString().slice(0, 10),
      }));
      setCheckInNotice(`签到成功，获得 ${data.reward.toLocaleString()} 积分，已连续 ${data.streakDays} 天`);
      await Promise.all([refreshMe(), refreshBalance(), loadTransactions()]);
      setTimeout(() => setCheckInNotice(''), 3000);
    } catch (error) {
      setCheckInNotice(error instanceof Error ? error.message : '签到失败');
      await loadCheckInStatus().catch(() => undefined);
    } finally {
      setCheckInLoading(false);
    }
  };

  const loadInviteData = async () => {
    setInviteLoading(true);
    try {
      const data = await api.get<InviteData>('/account/invites');
      setInviteData(data);
    } finally {
      setInviteLoading(false);
    }
  };

  const loadNotifications = async () => {
    setNotificationLoading(true);
    try {
      const data = await api.get<NotificationData>('/notifications?pageSize=20');
      setNotificationData(data);
    } finally {
      setNotificationLoading(false);
    }
  };

  const loadAccountStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<AccountStats>('/account/stats');
      setAccountStats(data);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const data = await api.get<MembershipPlan[]>('/membership-plans');
      setPlans(data || []);
    } finally {
      setPlansLoading(false);
    }
  };

  const refreshAccountOverview = async () => {
    await Promise.all([
      refreshMe(),
      refreshBalance(),
      loadTransactions(),
      loadOrders(),
      loadAccountStats(),
    ]);
  };

  const handleOpenNotifications = async () => {
    setNotificationOpen((prev) => !prev);
    await loadNotifications().catch(() => undefined);
  };

  const handleReadAllNotifications = async () => {
    await api.post('/notifications/read-all');
    await loadNotifications();
  };

  const handleRecharge = async (plan: MembershipPlan) => {
    setRechargeLoading(plan.name);
    setRechargeNotice('');
    try {
      const order = await createRechargeOrder({
        amount: plan.amount,
        tokens: plan.tokens,
        payment_method: 'mock',
      });
      if (order.payment?.mode === 'production') {
        await loadOrders();
        setRechargeNotice(`${plan.name}订单已创建，请继续完成真实支付`);
      } else {
        await payRechargeOrder(order.order_no);
        await Promise.all([refreshMe(), refreshBalance(), loadTransactions(), loadOrders()]);
        setRechargeNotice(`${plan.name}充值成功，${plan.tokens.toLocaleString()} 积分已到账`);
      }
      setTimeout(() => setRechargeNotice(''), 3000);
    } catch (error) {
      setRechargeNotice(error instanceof Error ? error.message : '充值失败');
    } finally {
      setRechargeLoading('');
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRechargeNotice('');
    try {
      const res = await api.post<{ tokens: number; balanceAfter: number }>('/redeem', {
        code: redeemCode.trim().toUpperCase(),
      });
      await Promise.all([refreshMe(), refreshBalance(), loadTransactions()]);
      setRechargeNotice(`兑换成功，${res.tokens.toLocaleString()} 积分已到账`);
      setRedeemCode('');
      setTimeout(() => setRechargeNotice(''), 3000);
    } catch (error) {
      setRechargeNotice(error instanceof Error ? error.message : '兑换失败');
      setTimeout(() => setRechargeNotice(''), 3000);
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };

  const handleChangePassword = async () => {
    setSecurityNotice('');
    if (!oldPassword || !newPassword) {
      setSecurityNotice('请输入当前密码和新密码');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityNotice('新密码长度不能少于 6 位');
      return;
    }
    setSecurityLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setSecurityNotice('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      await loadSecurityHistory();
    } catch (error) {
      setSecurityNotice(error instanceof Error ? error.message : '密码修改失败');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileNotice('');
    setProfileLoading(true);
    try {
      await api.patch('/account/profile', profileForm);
      await refreshMe();
      setProfileNotice('资料已保存');
    } catch (error) {
      setProfileNotice(error instanceof Error ? error.message : '保存资料失败');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setSecurityNotice('');
    if (!confirm('注销账户后将无法继续登录，但历史订单和流水会保留用于审计。确定继续吗？')) return;
    setSecurityLoading(true);
    try {
      await api.post('/account/deactivate', { password: deactivatePassword, confirmText: deactivateText });
      setSecurityNotice('账户已注销，即将退出登录');
      await logout();
      navigate('/login');
    } catch (error) {
      setSecurityNotice(error instanceof Error ? error.message : '注销账户失败');
    } finally {
      setSecurityLoading(false);
    }
  };

  const loadApiKeys = async () => {
    const data = await api.get<ApiKeyItem[]>('/account/api-keys');
    setApiKeys(data || []);
  };

  const handleCreateApiKey = async () => {
    setApiKeyNotice('');
    if (!newKeyName.trim()) {
      setApiKeyNotice('请输入密钥名称');
      return;
    }
    setApiKeyLoading(true);
    try {
      const result = await api.post<{ id: number; name: string; key: string }>('/account/api-keys', { name: newKeyName.trim() });
      setCreatedKey(result);
      setNewKeyName('');
      await loadApiKeys();
    } catch (error) {
      setApiKeyNotice(error instanceof Error ? error.message : '创建密钥失败');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleToggleApiKey = async (id: number, enabled: boolean) => {
    try {
      await api.patch(`/account/api-keys/${id}`, { enabled });
      await loadApiKeys();
    } catch (error) {
      setApiKeyNotice(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleDeleteApiKey = async (id: number) => {
    if (!confirm('删除后该密钥将立即失效，确定删除吗？')) return;
    try {
      await api.delete(`/account/api-keys/${id}`);
      await loadApiKeys();
    } catch (error) {
      setApiKeyNotice(error instanceof Error ? error.message : '删除失败');
    }
  };

  const workFilters: Array<{ id: WorkFilter; label: string; icon: React.ElementType }> = [
    { id: 'all', label: '全部', icon: Sparkles },
    { id: 'image', label: '图片', icon: Image },
    { id: 'video', label: '视频', icon: Video },
    { id: 'audio', label: '音频', icon: Music },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[10%] w-[360px] h-[360px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[10%] w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 min-h-16 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="w-9 h-9 rounded-full bg-[#171717] border border-white/[0.08] flex items-center justify-center text-[#aaa] hover:text-white hover:bg-white/[0.06] transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-[#f5f5f5]">个人中心</h1>
              <p className="text-xs text-[#666]">账户资产、作品、充值、API 与安全设置</p>
            </div>
          </div>

          <div className="w-full lg:w-auto flex items-center justify-between gap-2">
            <AppQuickNav compact />
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="relative px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white"
              >
                <Bell className="w-4 h-4 inline mr-1.5" />
                消息
                {notificationData.unread > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5">
                    {notificationData.unread > 99 ? '99+' : notificationData.unread}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-white/[0.1] bg-[#111] shadow-2xl shadow-black/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#eee]">站内消息</p>
                      <p className="text-[11px] text-[#666]">{notificationData.unread} 条未读</p>
                    </div>
                    <button
                      onClick={handleReadAllNotifications}
                      disabled={notificationData.unread === 0}
                      className="text-xs text-cyan-300 disabled:text-[#555] hover:text-cyan-200"
                    >
                      全部已读
                    </button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {notificationLoading ? (
                      <div className="py-8 text-center text-sm text-[#666]">加载中...</div>
                    ) : notificationData.list.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[#666]">暂无消息</div>
                    ) : (
                      notificationData.list.map((item) => (
                        <div key={item.id} className="rounded-xl p-3 hover:bg-white/[0.04] transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-[#eee]">{item.title}</p>
                            {!item.readAt && <span className="mt-1 w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                          </div>
                          <p className="mt-1 text-xs text-[#888] leading-relaxed">{item.content}</p>
                          <p className="mt-2 text-[11px] text-[#555]">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold hover:bg-[#7c3aed] transition-all">
              充值积分
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_300px] gap-5">
          <aside className="space-y-5">
            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
                  <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/20 overflow-hidden">
                    {avatarUploading ? (
                      <RefreshCw size={24} className="animate-spin text-white" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt={displayName} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      displayName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  {/* 悬浮遮罩 */}
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={18} className="text-white" />
                  </div>
                  <span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-[#0a0a0a] border border-white/[0.12] flex items-center justify-center">
                    <BadgeCheck className="w-4 h-4 text-cyan-300" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-[#f5f5f5] truncate">{displayName}</h2>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px]">普通会员</span>
                  </div>
                  <p className="text-xs text-[#666] mt-1">ID: 2PIX-{String(user?.id || 0).padStart(6, '0')}</p>
                  <p className="text-xs text-green-400 mt-1">{user?.status === 'active' ? '账号状态正常' : '账号状态异常'}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#171717] border border-white/[0.06] p-3">
                  <p className="text-[11px] text-[#666]">可用积分</p>
                  <p className="text-xl font-semibold text-amber-300 mt-1">{Number(displayBalance || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-[#171717] border border-white/[0.06] p-3">
                  <p className="text-[11px] text-[#666]">累计调用</p>
                  <p className="text-xl font-semibold text-cyan-300 mt-1">{(accountStats?.totalCalls ?? projects.length).toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={handleDailyCheckIn}
                disabled={todayChecked || checkInLoading}
                className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  todayChecked
                    ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                    : 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-50'
                }`}
              >
                {checkInLoading
                  ? '签到中...'
                  : todayChecked
                    ? `今日已签到 +${(checkInStatus?.todayReward || checkInStatus?.reward || 0).toLocaleString()}`
                    : `每日签到领取 ${(checkInStatus?.reward || 80).toLocaleString()} 积分`}
              </button>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#666]">
                <span>连续签到 {checkInStatus?.streakDays || 0} 天</span>
                <span>{checkInStatus?.lastCheckInDate ? `上次：${checkInStatus.lastCheckInDate}` : '还未签到'}</span>
              </div>
              {checkInNotice && (
                <p className={`mt-2 text-xs ${checkInNotice.includes('成功') ? 'text-green-300' : 'text-amber-300'}`}>
                  {checkInNotice}
                </p>
              )}
            </section>

            <nav className="rounded-3xl bg-[#111] border border-white/[0.08] p-2">
              {profileTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all ${
                    activeTab === tab.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-[#888] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
              ))}
            </nav>

            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-4">
              <h3 className="text-sm font-medium text-[#eee] mb-3">快捷入口</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Headphones, label: '在线客服' },
                  { icon: FileText, label: '我的发票' },
                  { icon: BookOpen, label: '用户协议' },
                  { icon: Shield, label: '隐私政策' },
                ].map((item) => (
                  <button key={item.label} className="p-3 rounded-2xl bg-[#171717] border border-white/[0.06] text-left text-[#999] hover:text-white hover:bg-white/[0.05]">
                    <item.icon className="w-4 h-4 mb-2" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-5">
            {/* 个人概览 - 仅在 overview tab 显示 */}
            {activeTab === 'overview' && (
            <section className="rounded-3xl bg-[#111] border border-white/[0.08] overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#f5f5f5]">账户概览</h2>
                  <p className="text-xs text-[#666] mt-1">实时统计你的创作资产和平台权益</p>
                </div>
                <button
                  onClick={refreshAccountOverview}
                  disabled={statsLoading}
                  className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 inline mr-1.5 ${statsLoading ? 'animate-spin' : ''}`} />
                  {statsLoading ? '刷新中' : '刷新'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
                {[
                  { label: '账户余额', value: `${Number(accountStats?.balance ?? displayBalance ?? 0).toLocaleString()} 积分`, icon: Wallet, color: 'text-amber-300' },
                  { label: '本月消费', value: `${Number(accountStats?.monthlyConsumption ?? 0).toLocaleString()} 积分`, icon: TrendingUp, color: 'text-rose-300' },
                  { label: '生成作品', value: `${Number(accountStats?.totalWorks ?? projects.length).toLocaleString()} 个`, icon: Sparkles, color: 'text-cyan-300' },
                  { label: '邀请收益', value: `${Number(accountStats?.invites.reward ?? inviteData?.totalReward ?? 0).toLocaleString()} 积分`, icon: Gift, color: 'text-emerald-300' },
                ].map((item) => (
                  <div key={item.label} className="p-5 border-r last:border-r-0 border-white/[0.08]">
                    <div className={`w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-[#666] mt-4">{item.label}</p>
                    <p className="text-lg font-semibold text-[#f5f5f5] mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.08] p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: '本月充值', value: `${Number(accountStats?.monthlyRechargeTokens ?? 0).toLocaleString()} 积分`, sub: `¥${Number(accountStats?.monthlyRechargeAmount ?? 0).toFixed(2)}` },
                    { label: 'API 密钥', value: `${accountStats?.apiKeys.enabled ?? 0}/${accountStats?.apiKeys.total ?? 0}`, sub: '启用 / 总数' },
                    { label: '连续签到峰值', value: `${accountStats?.checkins.maxStreak ?? 0} 天`, sub: `累计奖励 ${(accountStats?.checkins.totalReward ?? 0).toLocaleString()} 积分` },
                    { label: '邀请人数', value: `${accountStats?.invites.count ?? inviteData?.inviteCount ?? 0} 人`, sub: '已绑定邀请关系' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-[#171717] border border-white/[0.06] p-4">
                      <p className="text-[11px] text-[#666]">{item.label}</p>
                      <p className="text-base font-semibold text-[#f5f5f5] mt-1">{item.value}</p>
                      <p className="text-[11px] text-[#555] mt-1">{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-[#171717] border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#eee]">近 7 天趋势</h3>
                      <p className="text-[11px] text-[#666] mt-1">消费、充值、作品和调用的日维度统计</p>
                    </div>
                    <span className="text-[11px] text-[#666]">实时聚合</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 items-end h-32">
                    {(accountStats?.trend || []).map((item) => (
                      <div key={item.date} className="flex h-full flex-col justify-end gap-1">
                        <div className="flex items-end justify-center gap-0.5 h-24">
                          <span title={`消费 ${item.consumption}`} className="w-1.5 rounded-t bg-rose-400/70" style={{ height: `${Math.max(6, item.consumption / maxTrendValue * 96)}px` }} />
                          <span title={`充值 ${item.recharge}`} className="w-1.5 rounded-t bg-amber-300/70" style={{ height: `${Math.max(6, item.recharge / maxTrendValue * 96)}px` }} />
                          <span title={`作品 ${item.works}`} className="w-1.5 rounded-t bg-cyan-300/70" style={{ height: `${Math.max(6, item.works / maxTrendValue * 96)}px` }} />
                          <span title={`调用 ${item.calls}`} className="w-1.5 rounded-t bg-emerald-300/70" style={{ height: `${Math.max(6, item.calls / maxTrendValue * 96)}px` }} />
                        </div>
                        <p className="text-center text-[10px] text-[#555]">{item.date.slice(5)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-[#777]">
                    <span><i className="inline-block w-2 h-2 rounded-full bg-rose-400/70 mr-1" />消费</span>
                    <span><i className="inline-block w-2 h-2 rounded-full bg-amber-300/70 mr-1" />充值</span>
                    <span><i className="inline-block w-2 h-2 rounded-full bg-cyan-300/70 mr-1" />作品</span>
                    <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-300/70 mr-1" />调用</span>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* 在线充值 - 概览或充值 tab 显示 */}
            {(activeTab === 'overview' || activeTab === 'recharge') && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#f5f5f5]">在线充值</h2>
                    <p className="text-xs text-[#666] mt-1">当前为模拟支付到账，后续可替换为支付宝/微信真实回调</p>
                  </div>
                  <button
                    onClick={() => Promise.all([refreshMe(), refreshBalance(), loadTransactions(), loadOrders()])}
                    className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white"
                  >
                    查看价格规则
                  </button>
                </div>
                {rechargeNotice && (
                  <div className={`mb-4 px-4 py-3 rounded-2xl border text-sm ${
                    rechargeNotice.includes('成功')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/20 text-red-300'
                  }`}>
                    {rechargeNotice}
                  </div>
                )}

                <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-medium text-[#ddd] mb-3">兑换码</h3>
                  <div className="flex gap-3">
                    <input
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                      placeholder="输入兑换码"
                      className="flex-1 rounded-xl bg-[#171717] border border-white/[0.08] px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] outline-none focus:border-[#8b5cf6]/40"
                    />
                    <button
                      onClick={handleRedeem}
                      disabled={redeemLoading || !redeemCode.trim()}
                      className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7c4ddb] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {redeemLoading ? '兑换中...' : '兑换'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {plansLoading && (
                    <div className="col-span-full py-8 text-center text-sm text-[#666]">
                      <RefreshCw size={18} className="inline animate-spin mr-2" />
                      加载套餐中...
                    </div>
                  )}
                  {!plansLoading && plans.length === 0 && (
                    <div className="col-span-full py-8 text-center text-sm text-[#666]">
                      暂无可用充值套餐
                    </div>
                  )}
                  {!plansLoading && plans.map((plan) => (
                    <button
                      key={plan.id}
                      disabled={!!rechargeLoading}
                      onClick={() => handleRecharge(plan)}
                      className={`group rounded-2xl bg-gradient-to-br ${plan.tone || 'from-cyan-500/20 to-blue-500/10'} border border-white/[0.08] p-4 text-left hover:border-[#8b5cf6]/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#f5f5f5]">{plan.name}</span>
                        {plan.badge && (
                          <span className="px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 text-[#8b5cf6] text-[10px]">{plan.badge}</span>
                        )}
                      </div>
                      <p className="text-2xl font-semibold text-white mt-4">¥{plan.amount}</p>
                      <p className="text-xs text-[#aaa] mt-1">{plan.tokens.toLocaleString()} 积分</p>
                      {plan.description && (
                        <p className="text-[11px] text-[#666] mt-2 line-clamp-2">{plan.description}</p>
                      )}
                      <div className="mt-4 py-2 rounded-xl bg-white/[0.06] text-center text-xs text-[#ddd] group-hover:bg-[#8b5cf6] group-hover:text-[#111]">
                        {rechargeLoading === plan.name ? '处理中...' : '立即充值'}
                      </div>
                    </button>
                  ))}
                </div>
                {orders.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-white/[0.08]">
                    <h3 className="text-sm font-medium text-[#ddd] mb-3">最近充值订单</h3>
                    <div className="space-y-2">
                      {orders.slice(0, 3).map((order) => (
                        <div key={order.order_no} className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm">
                          <div>
                            <p className="text-[#ddd]">{order.order_no}</p>
                            <p className="text-xs text-[#666] mt-0.5">¥{order.amount} · {order.tokens.toLocaleString()} 积分 · {order.payment_method}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs ${
                            order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                          }`}>
                            {order.status === 'paid' ? '已到账' : '待支付'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 消费记录 - 仅在 records tab 显示 */}
            {activeTab === 'records' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#f5f5f5]">消费记录</h2>
                    <p className="text-xs text-[#666] mt-1">查看模型调用、充值与奖励明细</p>
                  </div>
                  <button className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white">
                    <Download className="w-4 h-4 inline mr-1.5" />
                    导出
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                  {transactions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[#666]">暂无额度流水</div>
                  ) : (
                    transactions.map((record) => (
                      <div key={record.id} className="grid grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_.7fr] gap-3 px-4 py-3 border-b last:border-b-0 border-white/[0.06] text-sm">
                        <span className="text-[#ddd] truncate">TX{String(record.id).padStart(8, '0')}</span>
                        <span className="text-[#aaa]">{record.description || record.type}</span>
                        <span className="text-[#777]">{record.related_id || '账户'}</span>
                        <span className={record.amount > 0 ? 'text-green-300' : 'text-amber-300'}>
                          {record.amount > 0 ? '+' : ''}{record.amount.toLocaleString()} 积分
                        </span>
                        <span className="text-cyan-300 text-right">已记录</span>
                        <span className="col-span-2 lg:col-span-5 text-[11px] text-[#555]">{new Date(record.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* 我的作品 - 仅在 overview tab 显示 */}
            {activeTab === 'overview' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#f5f5f5]">我的作品</h2>
                    <p className="text-xs text-[#666] mt-1">作品保留时间有限，请及时下载保存</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#171717] border border-white/[0.08] rounded-xl p-1">
                    {workFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setWorkFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                          workFilter === filter.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-[#777] hover:text-white'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="py-16 rounded-2xl bg-[#171717] border border-white/[0.06] flex flex-col items-center justify-center">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-[#777]">暂无作品</p>
                    <Link to="/home" className="mt-4 px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium">去创作</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredProjects.slice(0, 6).map((project) => (
                      <div key={project.id} className="rounded-2xl bg-[#171717] border border-white/[0.08] p-3">
                        <div className="aspect-video rounded-xl bg-[#222] flex items-center justify-center text-[#777]">
                          {project.type === 'image' && <Image className="w-7 h-7" />}
                          {project.type === 'video' && <Video className="w-7 h-7" />}
                          {project.type === 'audio' && <Music className="w-7 h-7" />}
                        </div>
                        <p className="text-sm text-[#eee] mt-3 truncate">{project.name}</p>
                        <p className="text-[11px] text-[#666] mt-1">{new Date(project.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'invite' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <h2 className="text-base font-semibold text-[#f5f5f5]">分享奖励</h2>
                <p className="text-xs text-[#666] mt-1">邀请好友注册并消费，可获得返佣奖励</p>
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4">
                  <div className="rounded-2xl bg-[#171717] border border-white/[0.08] p-5">
                    <p className="text-xs text-[#666]">专属邀请码</p>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-amber-300">{inviteCode}</code>
                      <button onClick={() => handleCopy(inviteCode, 'invite')} className="px-4 py-3 rounded-xl bg-[#8b5cf6] text-white">
                        {copied === 'invite' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5">
                    <p className="text-xs text-emerald-200/70">累计收益</p>
                    <p className="text-3xl font-semibold text-emerald-300 mt-3">
                      {inviteLoading ? '...' : `${(inviteData?.totalReward ?? 0).toLocaleString()} 积分`}
                    </p>
                    <p className="text-xs text-[#777] mt-2">
                      已邀请 {inviteLoading ? '...' : (inviteData?.inviteCount ?? 0)} 人
                    </p>
                  </div>
                </div>

                {inviteData && inviteData.list.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-medium text-[#bbb] mb-3">邀请记录</h3>
                    <div className="space-y-2">
                      {inviteData.list.map((item) => (
                        <div key={item.id} className="rounded-xl bg-[#171717] border border-white/[0.06] p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[#eee]">{item.inviteeName}</p>
                            <p className="text-[11px] text-[#555]">{new Date(item.createdAt).toLocaleDateString()}</p>
                          </div>
                          <p className="text-sm text-emerald-300">+{item.rewardAmount.toLocaleString()} 积分</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'api' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#f5f5f5]">API 密钥</h2>
                    <p className="text-xs text-[#666] mt-1">用于外部系统调用 2PIX 模型服务</p>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="输入密钥名称（如：Web 应用）"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
                  />
                  <button
                    onClick={handleCreateApiKey}
                    disabled={apiKeyLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] disabled:opacity-50"
                  >
                    {apiKeyLoading ? '创建中...' : '创建密钥'}
                  </button>
                </div>

                {apiKeyNotice && (
                  <div className={`mb-4 rounded-2xl px-4 py-3 text-sm border ${apiKeyNotice.includes('成功') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                    {apiKeyNotice}
                  </div>
                )}

                {createdKey && (
                  <div className="mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-cyan-200">密钥创建成功，请立即保存</p>
                      <button onClick={() => setCreatedKey(null)} className="text-xs text-[#888] hover:text-white">关闭</button>
                    </div>
                    <p className="text-xs text-[#888] mb-2">此完整密钥仅显示一次，关闭后无法再查看</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-cyan-500/20 text-amber-300 text-sm break-all">{createdKey.key}</code>
                      <button
                        onClick={() => handleCopy(createdKey.key, 'created-key')}
                        className="px-4 py-3 rounded-xl bg-[#8b5cf6] text-white"
                      >
                        {copied === 'created-key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {apiKeys.length === 0 && (
                    <div className="py-12 rounded-2xl bg-[#171717] border border-white/[0.06] flex flex-col items-center justify-center">
                      <Key className="w-8 h-8 text-[#444] mb-2" />
                      <p className="text-sm text-[#666]">暂无 API 密钥</p>
                      <p className="text-xs text-[#555] mt-1">创建密钥后可用于外部系统接入</p>
                    </div>
                  )}
                  {apiKeys.map((api) => (
                    <div key={api.id} className="rounded-2xl bg-[#171717] border border-white/[0.08] p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#eee]">{api.name}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${api.enabled ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                            {api.enabled ? '启用' : '停用'}
                          </span>
                        </div>
                        <p className="text-xs text-[#777] mt-1">{api.key_prefix}************ · {api.scope}</p>
                        <p className="text-[11px] text-[#555] mt-1">
                          最近使用：{api.last_used_at ? new Date(api.last_used_at).toLocaleString() : '从未使用'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleApiKey(api.id, !api.enabled)}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${api.enabled ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/20'}`}
                        >
                          {api.enabled ? '停用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(api.id)}
                          className="p-2 rounded-xl bg-[#222] text-[#aaa] hover:text-red-300 hover:bg-red-500/10 transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'settings' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#f5f5f5]">账号设置</h2>
                    <p className="text-xs text-[#666] mt-1">管理登录密码、安全记录和账户状态</p>
                  </div>
                  <button
                    onClick={() => loadSecurityHistory().catch(() => undefined)}
                    className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-1.5" />
                    刷新安全记录
                  </button>
                </div>

                {securityNotice && (
                  <div className={`mt-4 rounded-2xl px-4 py-3 text-sm border ${
                    securityNotice.includes('成功') || securityNotice.includes('注销')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                  }`}>
                    {securityNotice}
                  </div>
                )}

                {profileNotice && (
                  <div className={`mt-4 rounded-2xl px-4 py-3 text-sm border ${
                    profileNotice.includes('保存')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                  }`}>
                    {profileNotice}
                  </div>
                )}

                <div className="mt-5 rounded-2xl bg-[#171717] border border-white/[0.08] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#eee]">基础资料</h3>
                      <p className="text-xs text-[#666] mt-1">昵称、手机号和头像会同步展示到个人中心与后台用户详情</p>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileLoading}
                      className="px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold hover:bg-[#7c3aed] disabled:opacity-50"
                    >
                      {profileLoading ? '保存中...' : '保存资料'}
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-[#aaa]">
                      登录账号
                      <input
                        value={user?.username || ''}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#777]"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[#aaa]">
                      绑定邮箱
                      <input
                        value={user?.email || ''}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#777]"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[#aaa]">
                      昵称
                      <input
                        value={profileForm.nickname}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, nickname: e.target.value }))}
                        placeholder="请输入昵称"
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[#aaa]">
                      手机号
                      <input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="请输入中国大陆手机号"
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[#aaa] md:col-span-2">
                      头像 URL
                      <input
                        value={profileForm.avatar}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar: e.target.value }))}
                        placeholder="https://example.com/avatar.png"
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <button onClick={toggleTheme} className="w-full rounded-2xl bg-[#171717] border border-white/[0.08] px-4 py-3 flex items-center justify-between hover:bg-white/[0.04]">
                    <span className="flex items-center gap-3 text-sm text-[#eee]">{theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} 深浅模式</span>
                    <span className="text-xs text-[#777]">{theme === 'dark' ? '深色' : '浅色'}</span>
                  </button>
                  <button onClick={() => {
                    toggleLanguage();
                    toast.success(language === 'zh' ? 'Switched to English' : '已切换为中文');
                  }} className="w-full rounded-2xl bg-[#171717] border border-white/[0.08] px-4 py-3 flex items-center justify-between hover:bg-white/[0.04]">
                    <span className="flex items-center gap-3 text-sm text-[#eee]"><Languages className="w-4 h-4" /> 语言</span>
                    <span className="text-xs text-[#777]">{language === 'zh' ? '中文' : 'English'}</span>
                  </button>
                </div>

                <div className="mt-6 rounded-2xl bg-[#171717] border border-white/[0.08] p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-cyan-300" />
                    <h3 className="text-sm font-medium text-[#eee]">修改登录密码</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="当前密码"
                      className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="新密码，至少 6 位"
                      className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
                    />
                    <button
                      onClick={handleChangePassword}
                      disabled={securityLoading}
                      className="px-5 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      保存密码
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-[#171717] border border-white/[0.08] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#eee]">登录与安全记录</h3>
                      <p className="text-xs text-[#666] mt-1">最近 20 条登录、登出、改密和锁定记录</p>
                    </div>
                    <span className="text-xs text-[#777]">活跃会话 {securityHistory?.sessions.length || 0}</span>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-auto">
                    {!securityHistory?.logs.length && <div className="text-sm text-[#666] py-4 text-center">暂无安全记录</div>}
                    {securityHistory?.logs.map((item) => (
                      <div key={item.id} className="rounded-xl bg-[#0d0d0d] border border-white/[0.06] px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#eee]">{item.action}</span>
                          <span className="text-xs text-[#666]">{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-[#777] mt-1">IP：{item.ip_address || '未知'} · {item.user_agent?.slice(0, 80) || '未知设备'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-red-500/5 border border-red-500/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trash2 className="w-4 h-4 text-red-300" />
                    <h3 className="text-sm font-medium text-red-200">注销账户</h3>
                  </div>
                  <p className="text-xs text-[#888] leading-relaxed">
                    注销后账户将无法继续登录，历史订单、支付回调和额度流水会保留用于审计。请输入当前密码和“注销账户”确认。
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="password"
                      value={deactivatePassword}
                      onChange={(e) => setDeactivatePassword(e.target.value)}
                      placeholder="当前密码"
                      className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-red-500/20 text-sm text-[#eee] outline-none focus:border-red-500/40"
                    />
                    <input
                      value={deactivateText}
                      onChange={(e) => setDeactivateText(e.target.value)}
                      placeholder="输入：注销账户"
                      className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-red-500/20 text-sm text-[#eee] outline-none focus:border-red-500/40"
                    />
                    <button
                      onClick={handleDeactivateAccount}
                      disabled={securityLoading}
                      className="px-5 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm hover:bg-red-500/25 disabled:opacity-50"
                    >
                      确认注销
                    </button>
                  </div>
                </div>
              </section>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <h3 className="text-sm font-medium text-[#eee]">安全中心</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: '登录保护', value: '已开启', ok: true },
                  { label: '邮箱验证', value: '已验证', ok: true },
                  { label: '二次验证', value: '未开启', ok: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-[#888]">{item.label}</span>
                    <span className={item.ok ? 'text-green-300' : 'text-amber-300'}>{item.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <h3 className="text-sm font-medium text-[#eee]">公告</h3>
              <div className="mt-4 space-y-3">
                {[
                  '新增 Sora 2、Seedance、MiniMax 视频模型参数配置',
                  '后台模型接口支持 Mock/真实接口双模式切换',
                  '作品保留周期根据模型类型为 1-15 天',
                ].map((item) => (
                  <div key={item} className="flex gap-2 text-xs text-[#777] leading-relaxed">
                    <MessageCircle className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#111] border border-[#8b5cf6]/25 p-5">
              <Ticket className="w-6 h-6 text-[#8b5cf6]" />
              <h3 className="text-sm font-medium text-[#eee] mt-3">会员权益</h3>
              <p className="text-xs text-[#777] mt-2 leading-relaxed">升级会员可获得更高并发、更长作品保留时间、API 优先队列与专属客服。</p>
              <button className="w-full mt-4 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium">查看权益</button>
            </section>

            <button
              onClick={() => logout().finally(() => navigate('/login'))}
              className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/15 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
