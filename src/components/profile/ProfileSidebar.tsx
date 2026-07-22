import { BadgeCheck, Camera, ChevronRight, RefreshCw, Headphones, FileText, BookOpen, Shield } from 'lucide-react';
import type { CurrentUser } from '@/store/useAuthStore';
import { profileTabs, type ProfileTab, type CheckInStatus, type AccountStats } from './types';

interface ProfileSidebarProps {
  user: CurrentUser | null;
  displayName: string;
  displayBalance: number;
  totalCalls: number;
  accountStats: AccountStats | null;
  checkInStatus: CheckInStatus | null;
  checkInLoading: boolean;
  todayChecked: boolean;
  checkInNotice: string;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onAvatarClick: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  avatarUploading: boolean;
  onCheckIn: () => void;
}

export default function ProfileSidebar({
  user,
  displayName,
  displayBalance,
  totalCalls,
  accountStats,
  checkInStatus,
  checkInLoading,
  todayChecked,
  checkInNotice,
  activeTab,
  onTabChange,
  onAvatarClick,
  avatarInputRef,
  onAvatarChange,
  avatarUploading,
  onCheckIn,
}: ProfileSidebarProps) {
  return (
    <aside className="space-y-5">
      <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer group" onClick={onAvatarClick}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={onAvatarChange}
            />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/20 overflow-hidden">
              {avatarUploading ? (
                <RefreshCw size={24} className="animate-spin text-white" />
              ) : user?.avatar ? (
                <img src={user.avatar} alt={displayName} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </div>
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
            <p className="text-xl font-semibold text-cyan-300 mt-1">{totalCalls.toLocaleString()}</p>
          </div>
        </div>

        <button
          onClick={onCheckIn}
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
            onClick={() => onTabChange(tab.id)}
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
            <button
              key={item.label}
              className="p-3 rounded-2xl bg-[#171717] border border-white/[0.06] text-left text-[#999] hover:text-white hover:bg-white/[0.05]"
            >
              <item.icon className="w-4 h-4 mb-2" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
