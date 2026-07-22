import { Download } from 'lucide-react';
import type { AccountTransaction } from '@/store/useAccountStore';

interface ProfileRecordsTabProps {
  transactions: AccountTransaction[];
}

export default function ProfileRecordsTab({ transactions }: ProfileRecordsTabProps) {
  return (
    <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#f5f5f5]">消费记录</h2>
          <p className="text-xs text-[#666] mt-1">查看模型调用、充值与奖励明细</p>
        </div>
        <button className="px-3 py-2 rounded-xl bg-[#171717] border border-white/[0.08] text-xs text-[#aaa] hover:text-white">
          <Download className="w-4 h-4 inline mr-1.5" />
          导出
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#666]">暂无额度流水</div>
        ) : (
          transactions.map((record) => (
            <div
              key={record.id}
              className="grid grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_.7fr] gap-3 px-4 py-3 border-b last:border-b-0 border-white/[0.06] text-sm"
            >
              <span className="text-[#ddd] truncate">TX{String(record.id).padStart(8, '0')}</span>
              <span className="text-[#aaa]">{record.description || record.type}</span>
              <span className="text-[#777]">{record.related_id || '账户'}</span>
              <span className={record.amount > 0 ? 'text-green-300' : 'text-amber-300'}>
                {record.amount > 0 ? '+' : ''}
                {record.amount.toLocaleString()} 积分
              </span>
              <span className="text-cyan-300 text-right">已记录</span>
              <span className="col-span-2 lg:col-span-5 text-[11px] text-[#555]">
                {new Date(record.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
