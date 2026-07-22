import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  RefreshCw,
  Server,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '@/utils/api';

interface DashboardData {
  totalUsers: number;
  totalRevenue: number;
  totalCost: number;
  totalBalance: number;
  profit: number;
  todayUsers: number;
  todayRevenue: number;
  todayCalls: number;
  todayCost: number;
  todayOrders: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  orderConversionRate: number;
  activeUsers7d: number;
  totalWorks: number;
  todayWorks: number;
  worksByType: { image: number; video: number; audio: number };
  apiKeys: { total: number; enabled: number };
  invites: { count: number; reward: number };
  abnormalCallbacks: number;
  sevenDayTrend: { date: string; income: number; expense: number; calls: number; users: number; orders: number; works: number }[];
  topModels: { model: string; category: string; calls: number; total_cost: number }[];
  topUsers: { id: number; username: string; email: string; calls: number; total_cost: number }[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<DashboardData>('/admin/billing/dashboard');
      setData(result);
    } catch {
      // 静默失败：dashboard 数据非关键，刷新按钮可重试
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (value?: number) => `¥${Number(value || 0).toFixed(2)}`;
  const formatNumber = (value?: number) => Number(value || 0).toLocaleString();

  const stats = [
    {
      label: '今日新增用户',
      value: formatNumber(data?.todayUsers),
      sub: `总用户 ${formatNumber(data?.totalUsers)}`,
      icon: Users,
      color: 'purple',
    },
    {
      label: '今日充值金额',
      value: formatCurrency(data?.todayRevenue),
      sub: `累计收入 ${formatCurrency(data?.totalRevenue)}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: '今日模型调用',
      value: formatNumber(data?.todayCalls),
      sub: `今日消耗 ${formatNumber(data?.todayCost)} 积分`,
      icon: Activity,
      color: 'yellow',
    },
    {
      label: '待支付订单',
      value: formatNumber(data?.pendingOrders),
      sub: `转化率 ${Number(data?.orderConversionRate || 0).toFixed(1)}%`,
      icon: ShoppingCart,
      color: 'cyan',
    },
  ];

  const maxTrend = Math.max(
    ...(data?.sevenDayTrend?.flatMap((d) => [
      Number(d.income || 0),
      Number(d.expense || 0),
      Number(d.calls || 0),
      Number(d.users || 0),
      Number(d.orders || 0),
      Number(d.works || 0),
    ]) || [1]),
    1
  );
  const totalModelCost = data?.topModels?.reduce((sum, item) => sum + Number(item.total_cost || 0), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">数据概览</h1>
          <p className="text-dark-400 mt-1">平台运营、支付、模型调用和异常数据</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
            green: 'from-green-500/20 to-green-500/5 text-green-400',
            yellow: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400',
            cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
          };
          return (
            <div
              key={stat.label}
              className="glass rounded-2xl p-5 card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-green-400">
                  <ArrowUpRight size={14} />
                  实时
                </div>
              </div>
              <p className="text-2xl font-bold text-dark-100 mb-1">{stat.value}</p>
              <p className="text-sm text-dark-400">{stat.label}</p>
              <p className="text-xs text-dark-500 mt-2">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500">平台利润</p>
              <p className="text-xl font-bold text-dark-100">{formatCurrency(data?.profit)}</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <CreditCard size={22} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500">平台总余额</p>
              <p className="text-xl font-bold text-dark-100">{formatNumber(data?.totalBalance)} 积分</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm text-dark-500">支付异常回调</p>
              <p className="text-xl font-bold text-dark-100">{formatNumber(data?.abnormalCallbacks)} 条</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: '7 日活跃用户',
            value: formatNumber(data?.activeUsers7d),
            sub: `今日新增 ${formatNumber(data?.todayUsers)} 人`,
            icon: Users,
            tone: 'bg-blue-500/15 text-blue-400',
          },
          {
            label: '订单转化',
            value: `${Number(data?.orderConversionRate || 0).toFixed(1)}%`,
            sub: `已支付 ${formatNumber(data?.paidOrders)} / 总订单 ${formatNumber(data?.totalOrders)}`,
            icon: ShoppingCart,
            tone: 'bg-emerald-500/15 text-emerald-400',
          },
          {
            label: '作品产量',
            value: `${formatNumber(data?.totalWorks)} 个`,
            sub: `今日新增 ${formatNumber(data?.todayWorks)} 个`,
            icon: Activity,
            tone: 'bg-cyan-500/15 text-cyan-400',
          },
          {
            label: 'API 接入',
            value: `${formatNumber(data?.apiKeys?.enabled)} / ${formatNumber(data?.apiKeys?.total)}`,
            sub: `邀请返佣 ${formatNumber(data?.invites?.reward)} 积分`,
            icon: Server,
            tone: 'bg-amber-500/15 text-amber-400',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${item.tone} flex items-center justify-center`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-sm text-dark-500">{item.label}</p>
                  <p className="text-xl font-bold text-dark-100">{item.value}</p>
                  <p className="text-xs text-dark-500 mt-1">{item.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-dark-100 mb-4">作品类型分布</h3>
          <div className="space-y-3">
            {[
              { label: '图片', value: data?.worksByType?.image || 0, color: 'bg-cyan-500' },
              { label: '视频', value: data?.worksByType?.video || 0, color: 'bg-purple-500' },
              { label: '音频', value: data?.worksByType?.audio || 0, color: 'bg-amber-500' },
            ].map((item) => {
              const percent = data?.totalWorks ? (item.value / data.totalWorks) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-dark-300">{item.label}</span>
                    <span className="text-sm text-dark-400">{formatNumber(item.value)} 个</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="font-semibold text-dark-100 mb-4">运营漏斗</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '注册用户', value: data?.totalUsers || 0 },
              { label: '7日活跃', value: data?.activeUsers7d || 0 },
              { label: '创建订单', value: data?.totalOrders || 0 },
              { label: '支付订单', value: data?.paidOrders || 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-dark-800/60 border border-purple-500/10 p-4">
                <p className="text-xs text-dark-500">{item.label}</p>
                <p className="text-xl font-bold text-dark-100 mt-2">{formatNumber(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-dark-100 flex items-center gap-2">
              <Activity size={20} className="text-purple-400" />
              近 7 天趋势
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                收入
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                支出
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
                调用
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                订单
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                作品
              </span>
            </div>
          </div>
          <div className="h-64 flex items-end gap-1">
            {data?.sevenDayTrend?.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1 justify-end h-52">
                  <div
                    className="w-full bg-green-500/60 rounded-t transition-all hover:bg-green-500/80"
                    style={{ height: `${(Number(day.income || 0) / maxTrend) * 100}%`, minHeight: day.income > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="w-full bg-purple-500/60 rounded-t transition-all hover:bg-purple-500/80"
                    style={{ height: `${(Number(day.expense || 0) / maxTrend) * 100}%`, minHeight: day.expense > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="w-full bg-cyan-500/60 rounded-t transition-all hover:bg-cyan-500/80"
                    style={{ height: `${(Number(day.calls || 0) / maxTrend) * 100}%`, minHeight: day.calls > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="w-full bg-orange-500/60 rounded-t transition-all hover:bg-orange-500/80"
                    style={{ height: `${(Number(day.orders || 0) / maxTrend) * 100}%`, minHeight: day.orders > 0 ? '4px' : '0' }}
                  />
                  <div
                    className="w-full bg-blue-500/60 rounded-t transition-all hover:bg-blue-500/80"
                    style={{ height: `${(Number(day.works || 0) / maxTrend) * 100}%`, minHeight: day.works > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-xs text-dark-500">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-6">
            <Server size={20} className="text-purple-400" />
            热门模型排行
          </h3>
          <div className="space-y-4">
            {data?.topModels?.map((modelItem, index) => {
              const percent = (Number(modelItem.total_cost || 0) / totalModelCost) * 100;
              const colors = ['bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-green-500'];
              return (
                <div key={modelItem.model}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm text-dark-300">{modelItem.model}</span>
                      <p className="text-xs text-dark-500">{modelItem.category} · {formatNumber(modelItem.calls)} 次</p>
                    </div>
                    <span className="text-sm font-medium text-dark-200">{formatNumber(modelItem.total_cost)}</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[index % colors.length]} rounded-full transition-all`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold text-dark-100 mb-6">高消耗用户 TOP 10</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 font-medium">排名</th>
                <th className="pb-3 font-medium">用户</th>
                <th className="pb-3 font-medium">邮箱</th>
                <th className="pb-3 font-medium text-right">调用次数</th>
                <th className="pb-3 font-medium text-right">消耗积分</th>
              </tr>
            </thead>
            <tbody>
              {data?.topUsers?.map((user, idx) => (
                <tr key={user.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                  <td className="py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 'bg-dark-700 text-dark-400'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center text-white text-sm font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-dark-200 font-medium">{user.username}</span>
                    </div>
                  </td>
                  <td className="py-3 text-dark-400">{user.email}</td>
                  <td className="py-3 text-right text-dark-300">{formatNumber(user.calls)}</td>
                  <td className="py-3 text-right">
                    <span className="text-purple-400 font-semibold">{formatNumber(user.total_cost)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
