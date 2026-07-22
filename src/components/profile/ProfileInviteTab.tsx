import { Check, Copy } from 'lucide-react';
import type { InviteData } from './types';

interface ProfileInviteTabProps {
  inviteCode: string;
  inviteData: InviteData | null;
  inviteLoading: boolean;
  copied: string;
  onCopy: (text: string, key: string) => void;
}

export default function ProfileInviteTab({
  inviteCode,
  inviteData,
  inviteLoading,
  copied,
  onCopy,
}: ProfileInviteTabProps) {
  return (
    <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
      <h2 className="text-base font-semibold text-[#f5f5f5]">分享奖励</h2>
      <p className="text-xs text-[#666] mt-1">邀请好友注册并消费，可获得返佣奖励</p>
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4">
        <div className="rounded-2xl bg-[#171717] border border-white/[0.08] p-5">
          <p className="text-xs text-[#666]">专属邀请码</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-amber-300">{inviteCode}</code>
            <button onClick={() => onCopy(inviteCode, 'invite')} className="px-4 py-3 rounded-xl bg-[#8b5cf6] text-white">
              {copied === 'invite' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5">
          <p className="text-xs text-emerald-200/70">累计收益</p>
          <p className="text-3xl font-semibold text-emerald-300 mt-3">
            {inviteLoading ? '...' : `${(inviteData?.totalReward ?? 0).toLocaleString()} 积分`}
          </p>
          <p className="text-xs text-[#777] mt-2">已邀请 {inviteLoading ? '...' : (inviteData?.inviteCount ?? 0)} 人</p>
        </div>
      </div>

      {inviteData && inviteData.list.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-[#bbb] mb-3">邀请记录</h3>
          <div className="space-y-2">
            {inviteData.list.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#171717] border border-white/[0.06] p-3 flex items-center justify-between"
              >
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
  );
}
