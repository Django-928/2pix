import { Lock, RefreshCw, Moon, Sun, Languages, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { CurrentUser } from '@/store/useAuthStore';
import type { ProfileForm, SecurityHistory } from './types';

interface ProfileSettingsTabProps {
  user: CurrentUser | null;
  profileForm: ProfileForm;
  profileNotice: string;
  profileLoading: boolean;
  securityNotice: string;
  securityLoading: boolean;
  securityHistory: SecurityHistory | null;
  oldPassword: string;
  newPassword: string;
  deactivatePassword: string;
  deactivateText: string;
  theme: string;
  language: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onSaveProfile: () => void;
  onProfileFormChange: (form: ProfileForm) => void;
  onChangePassword: () => void;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onDeactivatePasswordChange: (value: string) => void;
  onDeactivateTextChange: (value: string) => void;
  onDeactivateAccount: () => void;
  onRefreshSecurityHistory: () => void;
}

export default function ProfileSettingsTab({
  user,
  profileForm,
  profileNotice,
  profileLoading,
  securityNotice,
  securityLoading,
  securityHistory,
  oldPassword,
  newPassword,
  deactivatePassword,
  deactivateText,
  theme,
  language,
  onToggleTheme,
  onToggleLanguage,
  onSaveProfile,
  onProfileFormChange,
  onChangePassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onDeactivatePasswordChange,
  onDeactivateTextChange,
  onDeactivateAccount,
  onRefreshSecurityHistory,
}: ProfileSettingsTabProps) {
  const toast = useToast();

  return (
    <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#f5f5f5]">账号设置</h2>
          <p className="text-xs text-[#666] mt-1">管理登录密码、安全记录和账户状态</p>
        </div>
        <button
          onClick={() => onRefreshSecurityHistory()}
          className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white"
        >
          <RefreshCw className="w-4 h-4 inline mr-1.5" />
          刷新安全记录
        </button>
      </div>

      {securityNotice && (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm border ${
            securityNotice.includes('成功') || securityNotice.includes('注销')
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          }`}
        >
          {securityNotice}
        </div>
      )}

      {profileNotice && (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm border ${
            profileNotice.includes('保存')
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          }`}
        >
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
            onClick={onSaveProfile}
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
              onChange={(e) => onProfileFormChange({ ...profileForm, nickname: e.target.value })}
              placeholder="请输入昵称"
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
            />
          </label>
          <label className="space-y-2 text-sm text-[#aaa]">
            手机号
            <input
              value={profileForm.phone}
              onChange={(e) => onProfileFormChange({ ...profileForm, phone: e.target.value })}
              placeholder="请输入中国大陆手机号"
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
            />
          </label>
          <label className="space-y-2 text-sm text-[#aaa] md:col-span-2">
            头像 URL
            <input
              value={profileForm.avatar}
              onChange={(e) => onProfileFormChange({ ...profileForm, avatar: e.target.value })}
              placeholder="https://example.com/avatar.png"
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          onClick={onToggleTheme}
          className="w-full rounded-2xl bg-[#171717] border border-white/[0.08] px-4 py-3 flex items-center justify-between hover:bg-white/[0.04]"
        >
          <span className="flex items-center gap-3 text-sm text-[#eee]">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} 深浅模式
          </span>
          <span className="text-xs text-[#777]">{theme === 'dark' ? '深色' : '浅色'}</span>
        </button>
        <button
          onClick={() => {
            onToggleLanguage();
            toast.success(language === 'zh' ? 'Switched to English' : '已切换为中文');
          }}
          className="w-full rounded-2xl bg-[#171717] border border-white/[0.08] px-4 py-3 flex items-center justify-between hover:bg-white/[0.04]"
        >
          <span className="flex items-center gap-3 text-sm text-[#eee]">
            <Languages className="w-4 h-4" /> 语言
          </span>
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
            onChange={(e) => onOldPasswordChange(e.target.value)}
            placeholder="当前密码"
            className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="新密码，至少 6 位"
            className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
          />
          <button
            onClick={onChangePassword}
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
              <p className="text-xs text-[#777] mt-1">
                IP：{item.ip_address || '未知'} · {item.user_agent?.slice(0, 80) || '未知设备'}
              </p>
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
            onChange={(e) => onDeactivatePasswordChange(e.target.value)}
            placeholder="当前密码"
            className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-red-500/20 text-sm text-[#eee] outline-none focus:border-red-500/40"
          />
          <input
            value={deactivateText}
            onChange={(e) => onDeactivateTextChange(e.target.value)}
            placeholder="输入：注销账户"
            className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-red-500/20 text-sm text-[#eee] outline-none focus:border-red-500/40"
          />
          <button
            onClick={onDeactivateAccount}
            disabled={securityLoading}
            className="px-5 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm hover:bg-red-500/25 disabled:opacity-50"
          >
            确认注销
          </button>
        </div>
      </div>
    </section>
  );
}
