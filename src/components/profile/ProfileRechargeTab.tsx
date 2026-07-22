import { RefreshCw } from 'lucide-react';
import type { AccountOrder } from '@/store/useAccountStore';
import type { MembershipPlan } from './types';

interface ProfileRechargeTabProps {
  plans: MembershipPlan[];
  plansLoading: boolean;
  rechargeLoading: string;
  rechargeNotice: string;
  redeemCode: string;
  redeemLoading: boolean;
  orders: AccountOrder[];
  onRecharge: (plan: MembershipPlan) => void;
  onRedeem: () => void;
  onRedeemCodeChange: (code: string) => void;
  onPriceRuleClick?: () => void;
}

export default function ProfileRechargeTab({
  plans,
  plansLoading,
  rechargeLoading,
  rechargeNotice,
  redeemCode,
  redeemLoading,
  orders,
  onRecharge,
  onRedeem,
  onRedeemCodeChange,
  onPriceRuleClick,
}: ProfileRechargeTabProps) {
  return (
    <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#f5f5f5]">在线充值</h2>
          <p className="text-xs text-[#666] mt-1">当前为模拟支付到账，后续可替换为支付宝/微信真实回调</p>
        </div>
        <button
          onClick={onPriceRuleClick}
          className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white"
        >
          查看价格规则
        </button>
      </div>

      {rechargeNotice && (
        <div
          className={`mb-4 px-4 py-3 rounded-2xl border text-sm ${
            rechargeNotice.includes('成功')
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {rechargeNotice}
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h3 className="text-sm font-medium text-[#ddd] mb-3">兑换码</h3>
        <div className="flex gap-3">
          <input
            value={redeemCode}
            onChange={(e) => onRedeemCodeChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onRedeem()}
            placeholder="输入兑换码"
            className="flex-1 rounded-xl bg-[#171717] border border-white/[0.08] px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555] outline-none focus:border-[#8b5cf6]/40"
          />
          <button
            onClick={onRedeem}
            disabled={redeemLoading || !redeemCode.trim()}
            className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7c4ddb] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {redeemLoading ? '兑换中...' : '兑换'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plansLoading && (
          <div className="col-span-full py-8 text-center text-sm text-[#666]">
            <RefreshCw size={18} className="inline animate-spin mr-2" />
            加载套餐中...
          </div>
        )}
        {!plansLoading && plans.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-[#666]">暂无可用充值套餐</div>
        )}
        {!plansLoading &&
          plans.map((plan) => (
            <button
              key={plan.id}
              disabled={!!rechargeLoading}
              onClick={() => onRecharge(plan)}
              className={`group rounded-2xl bg-gradient-to-br ${plan.tone || 'from-cyan-500/20 to-blue-500/10'} border border-white/[0.08] p-4 text-left hover:border-[#8b5cf6]/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#f5f5f5]">{plan.name}</span>
                {plan.badge && (
                  <span className="px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 text-[#8b5cf6] text-[10px]">{plan.badge}</span>
                )}
              </div>
              <p className="text-2xl font-semibold text-white mt-4">¥{plan.amount}</p>
              <p className="text-xs text-[#aaa] mt-1">{plan.tokens.toLocaleString()} 积分</p>
              {plan.description && <p className="text-[11px] text-[#666] mt-2 line-clamp-2">{plan.description}</p>}
              <div className="mt-4 py-2 rounded-xl bg-white/[0.06] text-center text-xs text-[#ddd] group-hover:bg-[#8b5cf6] group-hover:text-[#111]">
                {rechargeLoading === plan.name ? '处理中...' : '立即充值'}
              </div>
            </button>
          ))}
      </div>

      {orders.length > 0 && (
        <div className="mt-5 pt-5 border-t border-white/[0.08]">
          <h3 className="text-sm font-medium text-[#ddd] mb-3">最近充值订单</h3>
          <div className="space-y-2">
            {orders.slice(0, 3).map((order) => (
              <div
                key={order.order_no}
                className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-[#ddd]">{order.order_no}</p>
                  <p className="text-xs text-[#666] mt-0.5">
                    ¥{order.amount} · {order.tokens.toLocaleString()} 积分 · {order.payment_method}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-lg text-xs ${
                    order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {order.status === 'paid' ? '已到账' : '待支付'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
