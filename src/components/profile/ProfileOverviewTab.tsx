import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Sparkles, Gift, RefreshCw, Image, Video, Music } from 'lucide-react';
import type { Project } from '@/types';
import { workFilters, type WorkFilter, type AccountStats, type InviteData } from './types';

interface ProfileOverviewTabProps {
  accountStats: AccountStats | null;
  displayBalance: number;
  inviteData: InviteData | null;
  projects: Project[];
  workFilter: WorkFilter;
  onWorkFilterChange: (filter: WorkFilter) => void;
  statsLoading: boolean;
  onRefresh: () => void;
}

export default function ProfileOverviewTab({
  accountStats,
  displayBalance,
  inviteData,
  projects,
  workFilter,
  onWorkFilterChange,
  statsLoading,
  onRefresh,
}: ProfileOverviewTabProps) {
  const maxTrendValue = Math.max(
    1,
    ...(accountStats?.trend || []).flatMap((item) => [item.consumption, item.recharge, item.works, item.calls])
  );

  const filteredProjects = workFilter === 'all' ? projects : projects.filter((item) => item.type === workFilter);

  return (
    <>
      <section className="rounded-3xl bg-[#111] border border-white/[0.08] overflow-hidden">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#f5f5f5]">账户概览</h2>
            <p className="text-xs text-[#666] mt-1">实时统计你的创作资产和平台权益</p>
          </div>
          <button
            onClick={onRefresh}
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
                    <span title={`消费 ${item.consumption}`} className="w-1.5 rounded-t bg-rose-400/70" style={{ height: `${Math.max(6, (item.consumption / maxTrendValue) * 96)}px` }} />
                    <span title={`充值 ${item.recharge}`} className="w-1.5 rounded-t bg-amber-300/70" style={{ height: `${Math.max(6, (item.recharge / maxTrendValue) * 96)}px` }} />
                    <span title={`作品 ${item.works}`} className="w-1.5 rounded-t bg-cyan-300/70" style={{ height: `${Math.max(6, (item.works / maxTrendValue) * 96)}px` }} />
                    <span title={`调用 ${item.calls}`} className="w-1.5 rounded-t bg-emerald-300/70" style={{ height: `${Math.max(6, (item.calls / maxTrendValue) * 96)}px` }} />
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
                onClick={() => onWorkFilterChange(filter.id)}
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
    </>
  );
}
