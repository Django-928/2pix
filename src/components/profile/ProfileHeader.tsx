import { ArrowLeft, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppQuickNav from '@/components/layout/AppQuickNav';
import type { NotificationData } from './types';

interface ProfileHeaderProps {
  notificationData: NotificationData;
  notificationOpen: boolean;
  notificationLoading: boolean;
  onToggleNotifications: () => void;
  onReadAllNotifications: () => void;
}

export default function ProfileHeader({
  notificationData,
  notificationOpen,
  notificationLoading,
  onToggleNotifications,
  onReadAllNotifications,
}: ProfileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0a0a0a]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-5 min-h-16 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="w-9 h-9 rounded-full bg-[#171717] border border-white/[0.08] flex items-center justify-center text-[#aaa] hover:text-white hover:bg-white/[0.06] transition-all"
          >
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
              onClick={onToggleNotifications}
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
                    onClick={onReadAllNotifications}
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
  );
}
