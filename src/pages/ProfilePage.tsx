import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import useSettingsStore from '@/store/useSettingsStore';
import useAuthStore from '@/store/useAuthStore';
import useAccountStore from '@/store/useAccountStore';
import api from '@/utils/api';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import ProfileOverviewTab from '@/components/profile/ProfileOverviewTab';
import ProfileRechargeTab from '@/components/profile/ProfileRechargeTab';
import ProfileRecordsTab from '@/components/profile/ProfileRecordsTab';
import ProfileInviteTab from '@/components/profile/ProfileInviteTab';
import ProfileApiTab from '@/components/profile/ProfileApiTab';
import ProfileSettingsTab from '@/components/profile/ProfileSettingsTab';
import ProfileRightSidebar from '@/components/profile/ProfileRightSidebar';
import type {
  ProfileTab,
  WorkFilter,
  SecurityHistory,
  MembershipPlan,
  ApiKeyItem,
  CheckInStatus,
  InviteData,
  NotificationData,
  AccountStats,
  ProfileForm,
  CreatedApiKey,
} from '@/components/profile/types';

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
  const [profileForm, setProfileForm] = useState<ProfileForm>({ nickname: '', phone: '', avatar: '' });
  const [profileNotice, setProfileNotice] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
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

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarClick = () => avatarInputRef.current?.click();
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.warning('图片大小不能超过 500KB'); return; }
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'].includes(file.type)) { toast.warning('仅支持 PNG、JPG、GIF、WebP 格式'); return; }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try { await api.post<{ avatar: string }>('/account/avatar', { avatar: reader.result }); refreshMe(); }
      catch (err) { toast.error(err instanceof Error ? err.message : '头像上传失败'); }
      finally { setAvatarUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const loadSecurityHistory = async () => setSecurityHistory(await api.get<SecurityHistory>('/account/security-history'));
  const loadCheckInStatus = async () => setCheckInStatus(await api.get<CheckInStatus>('/account/checkin/status'));
  const loadApiKeys = async () => setApiKeys((await api.get<ApiKeyItem[]>('/account/api-keys')) || []);
  const loadInviteData = async () => {
    setInviteLoading(true);
    try { setInviteData(await api.get<InviteData>('/account/invites')); }
    finally { setInviteLoading(false); }
  };
  const loadNotifications = async () => {
    setNotificationLoading(true);
    try { setNotificationData(await api.get<NotificationData>('/notifications?pageSize=20')); }
    finally { setNotificationLoading(false); }
  };
  const loadAccountStats = async () => {
    setStatsLoading(true);
    try { setAccountStats(await api.get<AccountStats>('/account/stats')); }
    finally { setStatsLoading(false); }
  };
  const loadPlans = async () => {
    setPlansLoading(true);
    try { setPlans((await api.get<MembershipPlan[]>('/membership-plans')) || []); }
    finally { setPlansLoading(false); }
  };

  useEffect(() => {
    refreshMe();
    [refreshBalance, loadTransactions, loadOrders, loadSecurityHistory, loadApiKeys, loadCheckInStatus, loadInviteData, loadNotifications, loadAccountStats, loadPlans].forEach((fn) => fn().catch(() => undefined));
  }, [refreshMe, refreshBalance, loadTransactions, loadOrders]);

  useEffect(() => {
    if (user) setProfileForm({ nickname: user.nickname || '', phone: user.phone || '', avatar: user.avatar || '' });
  }, [user]);

  const handleDailyCheckIn = async () => {
    setCheckInNotice(''); setCheckInLoading(true);
    try {
      const data = await api.post<{ checkedIn: boolean; reward: number; streakDays: number; balance_after: number }>('/account/checkin');
      setCheckInStatus((prev) => ({
        today: prev?.today || new Date().toISOString().slice(0, 10),
        checkedIn: true, reward: data.reward, todayReward: data.reward, streakDays: data.streakDays,
        lastCheckInDate: prev?.today || new Date().toISOString().slice(0, 10),
      }));
      setCheckInNotice(`签到成功，获得 ${data.reward.toLocaleString()} 积分，已连续 ${data.streakDays} 天`);
      await Promise.all([refreshMe(), refreshBalance(), loadTransactions()]);
      setTimeout(() => setCheckInNotice(''), 3000);
    } catch (error) {
      setCheckInNotice(error instanceof Error ? error.message : '签到失败');
      await loadCheckInStatus().catch(() => undefined);
    } finally { setCheckInLoading(false); }
  };

  const refreshAccountOverview = async () => {
    await Promise.all([refreshMe(), refreshBalance(), loadTransactions(), loadOrders(), loadAccountStats()]);
  };

  const handleOpenNotifications = async () => { setNotificationOpen((prev) => !prev); await loadNotifications().catch(() => undefined); };
  const handleReadAllNotifications = async () => { await api.post('/notifications/read-all'); await loadNotifications(); };

  const handleRecharge = async (plan: MembershipPlan) => {
    setRechargeLoading(plan.name); setRechargeNotice('');
    try {
      const order = await createRechargeOrder({ amount: plan.amount, tokens: plan.tokens, payment_method: 'mock' });
      if (order.payment?.mode === 'production') {
        await loadOrders();
        setRechargeNotice(`${plan.name}订单已创建，请继续完成真实支付`);
      } else {
        await payRechargeOrder(order.order_no);
        await Promise.all([refreshMe(), refreshBalance(), loadTransactions(), loadOrders()]);
        setRechargeNotice(`${plan.name}充值成功，${plan.tokens.toLocaleString()} 积分已到账`);
      }
      setTimeout(() => setRechargeNotice(''), 3000);
    } catch (error) { setRechargeNotice(error instanceof Error ? error.message : '充值失败'); }
    finally { setRechargeLoading(''); }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true); setRechargeNotice('');
    try {
      const res = await api.post<{ tokens: number; balanceAfter: number }>('/redeem', { code: redeemCode.trim().toUpperCase() });
      await Promise.all([refreshMe(), refreshBalance(), loadTransactions()]);
      setRechargeNotice(`兑换成功，${res.tokens.toLocaleString()} 积分已到账`);
      setRedeemCode('');
      setTimeout(() => setRechargeNotice(''), 3000);
    } catch (error) {
      setRechargeNotice(error instanceof Error ? error.message : '兑换失败');
      setTimeout(() => setRechargeNotice(''), 3000);
    } finally { setRedeemLoading(false); }
  };

  const handleCopy = (text: string, key: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1600); };

  const handleChangePassword = async () => {
    setSecurityNotice('');
    if (!oldPassword || !newPassword) return setSecurityNotice('请输入当前密码和新密码');
    if (newPassword.length < 6) return setSecurityNotice('新密码长度不能少于 6 位');
    setSecurityLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setSecurityNotice('密码修改成功');
      setOldPassword(''); setNewPassword('');
      await loadSecurityHistory();
    } catch (error) { setSecurityNotice(error instanceof Error ? error.message : '密码修改失败'); }
    finally { setSecurityLoading(false); }
  };

  const handleSaveProfile = async () => {
    setProfileNotice(''); setProfileLoading(true);
    try { await api.patch('/account/profile', profileForm); await refreshMe(); setProfileNotice('资料已保存'); }
    catch (error) { setProfileNotice(error instanceof Error ? error.message : '保存资料失败'); }
    finally { setProfileLoading(false); }
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
    } catch (error) { setSecurityNotice(error instanceof Error ? error.message : '注销账户失败'); }
    finally { setSecurityLoading(false); }
  };

  const handleCreateApiKey = async () => {
    setApiKeyNotice('');
    if (!newKeyName.trim()) return setApiKeyNotice('请输入密钥名称');
    setApiKeyLoading(true);
    try {
      const result = await api.post<CreatedApiKey>('/account/api-keys', { name: newKeyName.trim() });
      setCreatedKey(result); setNewKeyName(''); await loadApiKeys();
    } catch (error) { setApiKeyNotice(error instanceof Error ? error.message : '创建密钥失败'); }
    finally { setApiKeyLoading(false); }
  };

  const handleToggleApiKey = async (id: number, enabled: boolean) => {
    try { await api.patch(`/account/api-keys/${id}`, { enabled }); await loadApiKeys(); }
    catch (error) { setApiKeyNotice(error instanceof Error ? error.message : '操作失败'); }
  };

  const handleDeleteApiKey = async (id: number) => {
    if (!confirm('删除后该密钥将立即失效，确定删除吗？')) return;
    try { await api.delete(`/account/api-keys/${id}`); await loadApiKeys(); }
    catch (error) { setApiKeyNotice(error instanceof Error ? error.message : '删除失败'); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[10%] w-[360px] h-[360px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-160px] right-[10%] w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <ProfileHeader
        notificationData={notificationData}
        notificationOpen={notificationOpen}
        notificationLoading={notificationLoading}
        onToggleNotifications={handleOpenNotifications}
        onReadAllNotifications={handleReadAllNotifications}
      />

      <main className="relative max-w-7xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_300px] gap-5">
          <ProfileSidebar
            user={user}
            displayName={displayName}
            displayBalance={displayBalance}
            totalCalls={accountStats?.totalCalls ?? projects.length}
            accountStats={accountStats}
            checkInStatus={checkInStatus}
            checkInLoading={checkInLoading}
            todayChecked={checkInStatus?.checkedIn ?? false}
            checkInNotice={checkInNotice}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAvatarClick={handleAvatarClick}
            avatarInputRef={avatarInputRef}
            onAvatarChange={handleAvatarChange}
            avatarUploading={avatarUploading}
            onCheckIn={handleDailyCheckIn}
          />

          <section className="min-w-0 space-y-5">
            {activeTab === 'overview' && (
              <ProfileOverviewTab
                accountStats={accountStats}
                displayBalance={displayBalance}
                inviteData={inviteData}
                projects={projects}
                workFilter={workFilter}
                onWorkFilterChange={setWorkFilter}
                statsLoading={statsLoading}
                onRefresh={refreshAccountOverview}
              />
            )}
            {(activeTab === 'overview' || activeTab === 'recharge') && (
              <ProfileRechargeTab
                plans={plans}
                plansLoading={plansLoading}
                rechargeLoading={rechargeLoading}
                rechargeNotice={rechargeNotice}
                redeemCode={redeemCode}
                redeemLoading={redeemLoading}
                orders={orders}
                onRecharge={handleRecharge}
                onRedeem={handleRedeem}
                onRedeemCodeChange={setRedeemCode}
                onPriceRuleClick={() => Promise.all([refreshMe(), refreshBalance(), loadTransactions(), loadOrders()])}
              />
            )}
            {activeTab === 'records' && <ProfileRecordsTab transactions={transactions} />}
            {activeTab === 'invite' && (
              <ProfileInviteTab
                inviteCode={inviteData?.inviteCode || user?.username || 'USER'}
                inviteData={inviteData}
                inviteLoading={inviteLoading}
                copied={copied}
                onCopy={handleCopy}
              />
            )}
            {activeTab === 'api' && (
              <ProfileApiTab
                apiKeys={apiKeys}
                apiKeyLoading={apiKeyLoading}
                newKeyName={newKeyName}
                createdKey={createdKey}
                apiKeyNotice={apiKeyNotice}
                copied={copied}
                onNewKeyNameChange={setNewKeyName}
                onCreateApiKey={handleCreateApiKey}
                onToggleApiKey={handleToggleApiKey}
                onDeleteApiKey={handleDeleteApiKey}
                onCloseCreatedKey={() => setCreatedKey(null)}
                onCopy={handleCopy}
              />
            )}
            {activeTab === 'settings' && (
              <ProfileSettingsTab
                user={user}
                profileForm={profileForm}
                profileNotice={profileNotice}
                profileLoading={profileLoading}
                securityNotice={securityNotice}
                securityLoading={securityLoading}
                securityHistory={securityHistory}
                oldPassword={oldPassword}
                newPassword={newPassword}
                deactivatePassword={deactivatePassword}
                deactivateText={deactivateText}
                theme={theme}
                language={language}
                onToggleTheme={toggleTheme}
                onToggleLanguage={toggleLanguage}
                onSaveProfile={handleSaveProfile}
                onProfileFormChange={setProfileForm}
                onChangePassword={handleChangePassword}
                onOldPasswordChange={setOldPassword}
                onNewPasswordChange={setNewPassword}
                onDeactivatePasswordChange={setDeactivatePassword}
                onDeactivateTextChange={setDeactivateText}
                onDeactivateAccount={handleDeactivateAccount}
                onRefreshSecurityHistory={loadSecurityHistory}
              />
            )}
          </section>

          <ProfileRightSidebar onLogout={() => logout().finally(() => navigate('/login'))} />
        </div>
      </main>
    </div>
  );
}
