import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import api from '@/utils/api';

interface MembershipPlan {
  id: number;
  name: string;
  amount: number;
  tokens: number;
  badge: string | null;
  tone: string | null;
  description: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const toneOptions = [
  { value: 'from-cyan-500/20 to-blue-500/10', label: '青蓝' },
  { value: 'from-amber-500/25 to-orange-500/10', label: '琥珀' },
  { value: 'from-purple-500/20 to-fuchsia-500/10', label: '紫罗兰' },
  { value: 'from-emerald-500/20 to-teal-500/10', label: '翠绿' },
  { value: 'from-rose-500/20 to-pink-500/10', label: '玫瑰' },
  { value: 'from-blue-500/20 to-indigo-500/10', label: '靛蓝' },
];

export default function AdminMembershipPlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [form, setForm] = useState<Partial<MembershipPlan>>({
    name: '',
    amount: 0,
    tokens: 0,
    badge: '',
    tone: toneOptions[0].value,
    description: '',
    sort_order: 0,
    status: 'active',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ list: MembershipPlan[]; total: number; page: number; pageSize: number }>('/admin/membership-plans');
      setPlans(Array.isArray(res.list) ? res.list : []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      amount: 0,
      tokens: 0,
      badge: '',
      tone: toneOptions[0].value,
      description: '',
      sort_order: plans.length + 1,
      status: 'active',
    });
    setShowModal(true);
  };

  const openEdit = (plan: MembershipPlan) => {
    setEditing(plan);
    setForm({ ...plan });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || form.amount === undefined || form.tokens === undefined) {
      setNotice('名称、价格和积分不能为空');
      return;
    }

    try {
      if (editing) {
        await api.put(`/admin/membership-plans/${editing.id}`, form);
        setNotice('套餐已更新');
      } else {
        await api.post('/admin/membership-plans', form);
        setNotice('套餐已创建');
      }
      setShowModal(false);
      await load();
      setTimeout(() => setNotice(''), 3000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该套餐？')) return;
    try {
      await api.delete(`/admin/membership-plans/${id}`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除失败');
    }
  };

  const seedDefaults = async () => {
    if (!confirm('确定初始化默认套餐？这不会覆盖已有套餐。')) return;
    try {
      await api.post('/admin/membership-plans/seed', {});
      await load();
      setNotice('默认套餐已初始化');
      setTimeout(() => setNotice(''), 3000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '初始化失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-purple-400">BILLING</p>
          <h1 className="mt-2 text-2xl font-bold text-dark-100">充值套餐</h1>
          <p className="mt-1 text-sm text-dark-400">配置前台展示的积分充值套餐，支持排序、上下架。</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={seedDefaults}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/10 bg-dark-900/50 px-4 py-2.5 text-sm text-dark-300 transition hover:bg-dark-800"
          >
            <RefreshCw size={16} />
            初始化默认套餐
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400"
          >
            <Plus size={16} />
            新增套餐
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.includes('成功') || notice.includes('已') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`glass rounded-2xl p-5 transition hover:bg-white/[0.02] ${plan.status === 'inactive' ? 'opacity-60' : ''}`}
          >
            <div className={`h-24 rounded-xl bg-gradient-to-br ${plan.tone || toneOptions[0].value} mb-4 flex flex-col justify-end p-4`}>
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-white/80" />
                <span className="text-lg font-semibold text-white">{plan.name}</span>
              </div>
              {plan.badge && (
                <span className="mt-2 w-fit rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/80">
                  {plan.badge}
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-dark-400">价格</span>
                <span className="text-dark-100 font-semibold">¥{plan.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-400">积分</span>
                <span className="text-dark-100 font-semibold">{plan.tokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-400">排序</span>
                <span className="text-dark-100">{plan.sort_order}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-400">状态</span>
                <span className={`inline-flex items-center gap-1 text-xs ${plan.status === 'active' ? 'text-emerald-400' : 'text-dark-500'}`}>
                  {plan.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {plan.status === 'active' ? '上架' : '下架'}
                </span>
              </div>
              {plan.description && (
                <p className="text-xs text-dark-500 pt-2">{plan.description}</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => openEdit(plan)}
                className="rounded-lg px-3 py-1.5 text-xs text-dark-300 transition hover:bg-dark-800"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                className="rounded-lg p-1.5 text-dark-400 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && !loading && (
          <div className="col-span-full rounded-2xl border border-dashed border-purple-500/20 p-12 text-center text-dark-500">
            暂无套餐，点击「初始化默认套餐」或「新增套餐」开始配置
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-purple-500/10 bg-[#13131a] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">
                {editing ? '编辑套餐' : '新增套餐'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-dark-200">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-dark-300">
                  名称
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
                <label className="space-y-2 text-sm text-dark-300">
                  标签
                  <input
                    value={form.badge || ''}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="新手推荐"
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-dark-300">
                  价格（元）
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
                <label className="space-y-2 text-sm text-dark-300">
                  积分
                  <input
                    type="number"
                    min={0}
                    value={form.tokens}
                    onChange={(e) => setForm({ ...form, tokens: Number(e.target.value) })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-dark-300">
                  排序
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  />
                </label>
                <label className="space-y-2 text-sm text-dark-300">
                  状态
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                  >
                    <option value="active">上架</option>
                    <option value="inactive">下架</option>
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-sm text-dark-300">
                配色
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setForm({ ...form, tone: tone.value })}
                      className={`h-10 flex-1 min-w-[80px] rounded-xl bg-gradient-to-br ${tone.value} text-xs text-white/90 border ${form.tone === tone.value ? 'border-white/40 ring-2 ring-purple-500/30' : 'border-transparent'}`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </label>
              <label className="space-y-2 text-sm text-dark-300">
                描述
                <input
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none focus:border-purple-500/30"
                />
              </label>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-purple-500/10 bg-dark-900/50 px-4 py-2 text-sm text-dark-300 transition hover:bg-dark-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400"
                >
                  <Save size={16} />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
