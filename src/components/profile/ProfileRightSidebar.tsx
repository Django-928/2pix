import { LogOut, MessageCircle, Shield, Ticket } from 'lucide-react';

interface ProfileRightSidebarProps {
  onLogout: () => void;
}

export default function ProfileRightSidebar({ onLogout }: ProfileRightSidebarProps) {
  return (
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
        <p className="text-xs text-[#777] mt-2 leading-relaxed">
          升级会员可获得更高并发、更长作品保留时间、API 优先队列与专属客服。
        </p>
        <button className="w-full mt-4 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium">查看权益</button>
      </section>

      <button
        onClick={onLogout}
        className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/15 flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        退出登录
      </button>
    </aside>
  );
}
