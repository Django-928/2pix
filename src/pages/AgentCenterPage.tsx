import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Download,
  ExternalLink,
  FileText,
  Gift,
  Headphones,
  KeyRound,
  Link2,
  Megaphone,
  MoreHorizontal,
  Package,
  Percent,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import AppQuickNav from '@/components/layout/AppQuickNav';

type AgentTab = 'dashboard' | 'clients' | 'commission' | 'withdraw' | 'materials' | 'settings';

const tabs: Array<{ id: AgentTab; label: string; icon: React.ElementType }> = [
  { id: 'dashboard', label: '代理概览', icon: BarChart3 },
  { id: 'clients', label: '客户管理', icon: Users },
  { id: 'commission', label: '佣金流水', icon: Percent },
  { id: 'withdraw', label: '提现管理', icon: Wallet },
  { id: 'materials', label: '推广素材', icon: Megaphone },
  { id: 'settings', label: '代理设置', icon: Settings },
];

const clients = [
  { name: '星河设计工作室', type: '企业客户', spent: '¥2,480', commission: '¥496', status: '活跃', date: '2026-07-01' },
  { name: '小鹿短视频', type: '创作者', spent: '¥698', commission: '¥139.6', status: '活跃', date: '2026-06-29' },
  { name: '蓝鲸电商', type: '企业客户', spent: '¥1,260', commission: '¥252', status: '沉默', date: '2026-06-25' },
  { name: '个人用户 A1029', type: '个人', spent: '¥99', commission: '¥19.8', status: '活跃', date: '2026-06-24' },
];

const commissionRows = [
  { id: 'CM20260702001', user: '星河设计工作室', order: '创作包 ¥99', rate: '20%', amount: '+¥19.8', time: '2026-07-02 11:12', status: '可提现' },
  { id: 'CM20260701008', user: '小鹿短视频', order: '专业包 ¥299', rate: '20%', amount: '+¥59.8', time: '2026-07-01 18:23', status: '可提现' },
  { id: 'CM20260629003', user: '蓝鲸电商', order: '企业包 ¥999', rate: '20%', amount: '+¥199.8', time: '2026-06-29 09:45', status: '结算中' },
];

const materials = [
  { title: '2PIX 首页海报', type: '海报', size: '1080×1920', desc: '适合朋友圈、社群推广' },
  { title: 'AI 视频生成案例', type: '视频', size: '16:9', desc: '展示 Sora 2 / Veo 3.1 效果' },
  { title: '套餐价格长图', type: '长图', size: '750×2200', desc: '用于介绍积分套餐与权益' },
  { title: '代理招商介绍', type: 'PDF', size: '8 页', desc: '面向企业合作伙伴' },
];

export default function AgentCenterPage() {
  const [activeTab, setActiveTab] = useState<AgentTab>('dashboard');
  const [keyword, setKeyword] = useState('');
  const [copied, setCopied] = useState('');
  const inviteLink = 'https://2pix.ai/register?agent=DJANGO2026';
  const inviteCode = 'DJANGO2026';

  const filteredClients = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return clients;
    return clients.filter((item) => item.name.toLowerCase().includes(k) || item.type.toLowerCase().includes(k));
  }, [keyword]);

  const copyText = (value: string, key: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 left-[18%] w-[380px] h-[380px] rounded-full bg-[#8b5cf6]/10 blur-3xl" />
        <div className="absolute top-[28%] -right-32 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-36 left-[35%] w-[360px] h-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto min-h-16 px-5 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="w-9 h-9 rounded-full bg-[#171717] border border-white/[0.08] flex items-center justify-center text-[#aaa] hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center shadow-lg shadow-[#8b5cf6]/15">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">代理商中心</h1>
              <p className="text-xs text-[#666]">推广获客、佣金结算、客户管理与素材分发</p>
            </div>
          </div>

          <div className="w-full lg:w-auto flex items-center justify-between gap-2">
            <AppQuickNav compact />
            <button className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white">
              <Headphones className="w-4 h-4 inline mr-1.5" />
              代理客服
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold hover:bg-[#7c3aed] transition-all">
              申请升级
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)_300px] gap-5">
          <aside className="space-y-5">
            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center text-white font-black text-2xl">
                    A
                  </div>
                  <span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-[#0a0a0a] border border-white/[0.12] flex items-center justify-center">
                    <BadgeCheck className="w-4 h-4 text-[#8b5cf6]" />
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">Django 代理商</h2>
                  <p className="text-xs text-[#777] mt-1">代理等级：黄金代理</p>
                  <p className="text-xs text-emerald-300 mt-1">佣金比例 20%</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#171717] border border-white/[0.06] p-3">
                  <p className="text-[11px] text-[#666]">可提现</p>
                  <p className="text-xl font-semibold text-emerald-300 mt-1">¥496.20</p>
                </div>
                <div className="rounded-2xl bg-[#171717] border border-white/[0.06] p-3">
                  <p className="text-[11px] text-[#666]">客户数</p>
                  <p className="text-xl font-semibold text-cyan-300 mt-1">128</p>
                </div>
              </div>
            </section>

            <nav className="rounded-3xl bg-[#111] border border-white/[0.08] p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all ${
                    activeTab === tab.id ? 'bg-[#8b5cf6]/15 text-[#8b5cf6]' : 'text-[#888] hover:text-white hover:bg-white/[0.04]'
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

            <section className="rounded-3xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#111] border border-[#8b5cf6]/25 p-5">
              <ShieldCheck className="w-6 h-6 text-[#8b5cf6]" />
              <h3 className="text-sm font-semibold mt-3">代理权益</h3>
              <p className="text-xs text-[#777] mt-2 leading-relaxed">黄金代理享 20% 佣金、专属推广链接、客户明细、结算提现和官方素材包。</p>
              <button className="w-full mt-4 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold">查看规则</button>
            </section>
          </aside>

          <section className="space-y-5 min-w-0">
            <section className="rounded-3xl bg-[#111] border border-white/[0.08] overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">代理数据</h2>
                  <p className="text-xs text-[#666] mt-1">实时统计推广转化、订单、佣金与客户增长</p>
                </div>
                <button className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white">
                  <Download className="w-4 h-4 inline mr-1.5" />
                  导出报表
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: '今日访问', value: '1,284', icon: TrendingUp, color: 'text-cyan-300' },
                  { label: '注册转化', value: '86', icon: UserPlus, color: 'text-emerald-300' },
                  { label: '订单金额', value: '¥4,537', icon: Banknote, color: 'text-amber-300' },
                  { label: '预计佣金', value: '¥907.40', icon: Percent, color: 'text-rose-300' },
                ].map((item) => (
                  <div key={item.label} className="p-5 border-r last:border-r-0 border-white/[0.08]">
                    <div className={`w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-[#666] mt-4">{item.label}</p>
                    <p className="text-lg font-semibold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {(activeTab === 'dashboard' || activeTab === 'settings') && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">推广链接</h2>
                    <p className="text-xs text-[#666] mt-1">复制链接或邀请码给客户，注册消费后自动归属</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs">归因有效期 90 天</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4">
                  <div className="rounded-2xl bg-[#171717] border border-white/[0.08] p-4">
                    <p className="text-xs text-[#666] mb-2">专属推广链接</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-[#8b5cf6] text-sm truncate">{inviteLink}</code>
                      <button onClick={() => copyText(inviteLink, 'link')} className="px-4 py-3 rounded-xl bg-[#8b5cf6] text-white">
                        {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-2 rounded-xl bg-white/[0.05] text-xs text-[#aaa] hover:text-white">
                        <ExternalLink className="w-3.5 h-3.5 inline mr-1.5" />
                        打开预览
                      </button>
                      <button className="px-3 py-2 rounded-xl bg-white/[0.05] text-xs text-[#aaa] hover:text-white">
                        <Link2 className="w-3.5 h-3.5 inline mr-1.5" />
                        自定义落地页
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#171717] border border-white/[0.08] p-4 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-2xl bg-white p-3 flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-[#111]" />
                    </div>
                    <p className="text-xs text-[#777] mt-3">推广二维码</p>
                  </div>
                </div>
              </section>
            )}

            {(activeTab === 'dashboard' || activeTab === 'clients') && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">客户管理</h2>
                    <p className="text-xs text-[#666] mt-1">查看客户来源、消费和佣金贡献</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索客户..."
                      className="w-48 pl-8 pr-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#eee] outline-none"
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                  {filteredClients.map((client) => (
                    <div key={client.name} className="grid grid-cols-2 lg:grid-cols-[1.4fr_.9fr_.8fr_.8fr_.7fr] gap-3 px-4 py-3 border-b last:border-b-0 border-white/[0.06] items-center">
                      <div>
                        <p className="text-sm text-[#eee]">{client.name}</p>
                        <p className="text-[11px] text-[#555]">注册：{client.date}</p>
                      </div>
                      <span className="text-xs text-[#888]">{client.type}</span>
                      <span className="text-xs text-amber-300">{client.spent}</span>
                      <span className="text-xs text-emerald-300">{client.commission}</span>
                      <span className={`text-xs text-right ${client.status === '活跃' ? 'text-cyan-300' : 'text-[#777]'}`}>{client.status}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === 'dashboard' || activeTab === 'commission') && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">佣金流水</h2>
                    <p className="text-xs text-[#666] mt-1">订单支付成功后生成佣金记录，结算后可提现</p>
                  </div>
                  <button className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white">筛选</button>
                </div>
                <div className="space-y-2">
                  {commissionRows.map((row) => (
                    <div key={row.id} className="rounded-2xl bg-[#171717] border border-white/[0.08] p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#eee]">{row.user}</p>
                        <p className="text-xs text-[#777] mt-1">{row.id} · {row.order} · {row.rate}</p>
                        <p className="text-[11px] text-[#555] mt-1">{row.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-emerald-300">{row.amount}</p>
                        <p className="text-xs text-[#8b5cf6] mt-1">{row.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'withdraw' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <h2 className="text-base font-semibold">提现申请</h2>
                <p className="text-xs text-[#666] mt-1">最低 ¥100 可提现，审核通过后 1-3 个工作日到账</p>
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
                  <div className="rounded-2xl bg-[#171717] border border-white/[0.08] p-5">
                    <p className="text-xs text-[#666]">可提现金额</p>
                    <p className="text-4xl font-semibold text-emerald-300 mt-3">¥496.20</p>
                    <button className="w-full mt-5 py-3 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold">立即提现</button>
                  </div>
                  <div className="rounded-2xl bg-[#171717] border border-white/[0.08] p-5">
                    <p className="text-sm font-medium">收款账户</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-[#777]">账户类型</span><span>支付宝</span></div>
                      <div className="flex justify-between"><span className="text-[#777]">实名状态</span><span className="text-green-300">已认证</span></div>
                      <div className="flex justify-between"><span className="text-[#777]">结算周期</span><span>T+7</span></div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'materials' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <h2 className="text-base font-semibold">推广素材</h2>
                <p className="text-xs text-[#666] mt-1">下载官方海报、视频、价格说明和招商资料</p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {materials.map((item) => (
                    <div key={item.title} className="rounded-2xl bg-[#171717] border border-white/[0.08] p-4">
                      <div className="w-11 h-11 rounded-2xl bg-[#8b5cf6]/15 text-[#8b5cf6] flex items-center justify-center">
                        {item.type === 'PDF' ? <FileText className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                      <p className="text-sm font-medium mt-3">{item.title}</p>
                      <p className="text-xs text-[#777] mt-1">{item.type} · {item.size}</p>
                      <p className="text-xs text-[#666] mt-2">{item.desc}</p>
                      <button className="mt-4 px-3 py-2 rounded-xl bg-white/[0.05] text-xs text-[#aaa] hover:text-white">
                        <Download className="w-3.5 h-3.5 inline mr-1.5" />
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'settings' && (
              <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
                <h2 className="text-base font-semibold">代理设置</h2>
                <div className="mt-5 space-y-3">
                  {[
                    { icon: KeyRound, label: '归因邀请码', value: inviteCode },
                    { icon: Ticket, label: '默认优惠券', value: '新人 8 折券' },
                    { icon: Gift, label: '客户奖励', value: '注册赠送 300 积分' },
                    { icon: ShieldCheck, label: '客户保护期', value: '90 天' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-[#171717] border border-white/[0.08] px-4 py-3 flex items-center justify-between">
                      <span className="flex items-center gap-3 text-sm text-[#eee]"><item.icon className="w-4 h-4 text-[#999]" />{item.label}</span>
                      <span className="text-xs text-[#777]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <h3 className="text-sm font-semibold">等级进度</h3>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#777]">黄金代理</span>
                  <span className="text-[#8b5cf6]">距离钻石还差 ¥5,463</span>
                </div>
                <div className="h-2 rounded-full bg-[#222] overflow-hidden">
                  <div className="h-full w-[62%] bg-gradient-to-r from-[#8b5cf6] to-[#6366f1]" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[0.04] py-2"><p className="text-xs text-[#777]">白银</p><p className="text-[10px] text-[#555]">15%</p></div>
                <div className="rounded-xl bg-[#8b5cf6]/15 py-2 border border-[#8b5cf6]/20"><p className="text-xs text-[#8b5cf6]">黄金</p><p className="text-[10px] text-[#8b5cf6]">20%</p></div>
                <div className="rounded-xl bg-white/[0.04] py-2"><p className="text-xs text-[#777]">钻石</p><p className="text-[10px] text-[#555]">25%</p></div>
              </div>
            </section>

            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <h3 className="text-sm font-semibold">待办提醒</h3>
              <div className="mt-4 space-y-3">
                {[
                  '3 笔佣金将在明天进入可提现',
                  '2 个客户 7 天内未复购，可发送优惠券',
                  '本月还差 ¥5,463 升级钻石代理',
                ].map((text) => (
                  <div key={text} className="flex gap-2 text-xs text-[#777] leading-relaxed">
                    <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">快速操作</h3>
                <MoreHorizontal className="w-4 h-4 text-[#666]" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { icon: Copy, label: '复制链接' },
                  { icon: QrCode, label: '二维码' },
                  { icon: Gift, label: '发券' },
                  { icon: Headphones, label: '客服' },
                ].map((item) => (
                  <button key={item.label} className="p-3 rounded-2xl bg-[#171717] border border-white/[0.06] text-left text-[#999] hover:text-white hover:bg-white/[0.05]">
                    <item.icon className="w-4 h-4 mb-2" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
