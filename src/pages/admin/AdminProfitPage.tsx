import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp, DollarSign, BarChart3, Zap, AlertTriangle } from 'lucide-react';
import api from '@/utils/api';

interface ModelProfit {
  model: string;
  category: string;
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  revenue: number;
  estimatedCost: number;
  grossProfit: number;
  margin: number;
  failedCalls: number;
  refundedCalls: number;
}

interface ProfitData {
  days: number;
  models: ModelProfit[];
  totals: { calls: number; revenue: number; cost: number; profit: number; failed: number; refunded: number };
  overallMargin: number;
}

export default function AdminProfitPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<ProfitData>(`/admin/billing/profit-analysis?days=${days}`);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const isLowMargin = (m: number) => m < 20;
  const isNegative = (m: number) => m < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">模型成本利润分析</h1>
          <p className="text-dark-400 mt-1">按模型分析收入、成本和毛利率，识别低效模型。</p>
        </div>
        <div className="flex gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input-field">
            <option value={1}>近 1 天</option>
            <option value={7}>近 7 天</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* 总览卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: '分析周期', value: `${data.days} 天`, icon: BarChart3, tone: 'bg-purple-500/20 text-purple-400' },
              { label: '总调用', value: data.totals.calls.toLocaleString(), icon: Zap, tone: 'bg-cyan-500/20 text-cyan-400' },
              { label: '总收入', value: data.totals.revenue.toLocaleString(), icon: DollarSign, tone: 'bg-emerald-500/20 text-emerald-400' },
              { label: '估算成本', value: data.totals.cost.toLocaleString(), icon: TrendingDown, tone: 'bg-red-500/20 text-red-400' },
              { label: '毛利润', value: data.totals.profit.toLocaleString(), icon: TrendingUp, tone: data.totals.profit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400' },
              { label: '综合毛利率', value: `${data.overallMargin}%`, icon: DollarSign, tone: isLowMargin(data.overallMargin) ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg ${item.tone} flex items-center justify-center`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-dark-500">{item.label}</p>
                      <p className="text-lg font-bold text-dark-100">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 模型列表 */}
          <section className="glass rounded-2xl p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-dark-500 border-b border-purple-500/10">
                    <th className="pb-3 px-4 font-medium">模型</th>
                    <th className="pb-3 px-4 font-medium">分类</th>
                    <th className="pb-3 px-4 font-medium text-right">调用次数</th>
                    <th className="pb-3 px-4 font-medium text-right">收入(积分)</th>
                    <th className="pb-3 px-4 font-medium text-right">估算成本</th>
                    <th className="pb-3 px-4 font-medium text-right">毛利润</th>
                    <th className="pb-3 px-4 font-medium text-right">毛利率</th>
                    <th className="pb-3 px-4 font-medium text-right">失败/退款</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-dark-500">暂无数据</td></tr>
                  )}
                  {data.models.map((m) => (
                    <tr key={m.model} className={`border-b border-purple-500/5 hover:bg-purple-500/5 ${isNegative(m.margin) ? 'bg-red-500/5' : ''}`}>
                      <td className="py-3 px-4 text-sm font-medium text-dark-100">{m.model}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-300">{m.category}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-dark-300 text-right">{m.totalCalls.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-emerald-400 text-right">{m.revenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-red-400 text-right">{m.estimatedCost.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-sm text-right font-medium ${m.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.grossProfit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${isNegative(m.margin) ? 'bg-red-500/10 text-red-400' : isLowMargin(m.margin) ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {m.margin}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-dark-500 text-right">
                        {(m.failedCalls + m.refundedCalls) > 0 && (
                          <span className="flex items-center gap-1 justify-end text-xs">
                            <AlertTriangle size={12} className="text-amber-400" />
                            {m.failedCalls}/{m.refundedCalls}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-dark-500">
              注：成本基于价格配置中的 cost_multiplier 估算，毛利率 = (收入 - 成本) / 收入 × 100%。红色标记表示负毛利模型。
            </div>
          </section>
        </>
      )}
    </div>
  );
}
