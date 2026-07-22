import { useState, useEffect } from 'react';
import {
  Settings,
  Search,
  RefreshCw,
  Save,
  Coins,
  Zap,
  ToggleLeft,
  ToggleRight,
  CreditCard,
  BarChart3,
  Plus,
} from 'lucide-react';
import api from '@/utils/api';
import { useToast } from '@/components/ui/Toast';

interface ModelPricing {
  id: number;
  local_model: string;
  category: string;
  display_name: string;
  cost_per_unit: number;
  unit_type: string;
  unit_label: string;
  description: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  total_cost: number;
  call_count: number;
}

interface RechargePlan {
  id: number;
  name: string;
  credits: number;
  price_yuan: number;
  bonus_credits: number;
  enabled: number;
  sort_order: number;
  created_at: string;
}

type Tab = 'pricing' | 'recharge';

export default function AdminPricingPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('pricing');
  const [pricingList, setPricingList] = useState<ModelPricing[]>([]);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // 编辑态暂存
  const [editMap, setEditMap] = useState<Record<string, Partial<ModelPricing>>>({});
  const [editPlanMap, setEditPlanMap] = useState<Record<number, Partial<RechargePlan>>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricing, plans] = await Promise.all([
        api.get<ModelPricing[]>('/pricing/admin/models'),
        api.get<RechargePlan[]>('/pricing/admin/recharge-plans'),
      ]);
      setPricingList(pricing);
      setRechargePlans(plans);
      setEditMap({});
      setEditPlanMap({});
    } catch {
      toast.error('加载定价数据失败');
    } finally {
      setLoading(false);
    }
  };

  // ========== 定价编辑 ==========
  const updateEditField = (model: string, field: keyof ModelPricing, value: number | string) => {
    setEditMap((prev) => ({
      ...prev,
      [model]: { ...prev[model], [field]: value },
    }));
  };

  const toggleEnabled = (model: string, currentEnabled: number) => {
    const current = editMap[model]?.enabled ?? currentEnabled;
    updateEditField(model, 'enabled', current ? 0 : 1);
  };

  const hasChanges = () => Object.keys(editMap).length > 0;
  const hasPlanChanges = () => Object.keys(editPlanMap).length > 0;

  const handleSavePricing = async () => {
    if (!hasChanges()) return;
    setSaving(true);
    try {
      const items = Object.entries(editMap).map(([localModel, changes]) => ({
        local_model: localModel,
        cost_per_unit: changes.cost_per_unit ?? 1,
        unit_type: changes.unit_type ?? 'per_call',
        unit_label: changes.unit_label ?? '次',
        description: changes.description ?? '',
        enabled: changes.enabled ?? 1,
      }));
      await api.put('/pricing/admin/models', { items });
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== 充值套餐编辑 ==========
  const updatePlanField = (id: number, field: keyof RechargePlan, value: number | string) => {
    setEditPlanMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const togglePlanEnabled = (id: number, currentEnabled: number) => {
    const current = editPlanMap[id]?.enabled ?? currentEnabled;
    updatePlanField(id, 'enabled', current ? 0 : 1);
  };

  const handleSavePlans = async () => {
    if (!hasPlanChanges()) return;
    setSaving(true);
    try {
      const items = Object.entries(editPlanMap).map(([id, changes]) => {
        const plan = rechargePlans.find((p) => p.id === Number(id));
        return {
          id: Number(id),
          name: changes.name ?? plan?.name ?? '',
          credits: changes.credits ?? plan?.credits ?? 100,
          price_yuan: changes.price_yuan ?? plan?.price_yuan ?? 10,
          bonus_credits: changes.bonus_credits ?? plan?.bonus_credits ?? 0,
          enabled: changes.enabled ?? plan?.enabled ?? 1,
          sort_order: changes.sort_order ?? plan?.sort_order ?? 0,
        };
      });
      await api.put('/pricing/admin/recharge-plans', { items });
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== 过滤 ==========
  const filteredPricing = pricingList.filter((p) => {
    const matchSearch =
      !search ||
      p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.local_model.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = Array.from(new Set(pricingList.map((p) => p.category)));

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      chat: '聊天模型',
      image: '图像生成',
      video: '视频生成',
      audio: '音频生成',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      chat: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      image: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      video: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      audio: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    return colors[category] || 'bg-dark-700 text-dark-400 border-dark-600';
  };

  const getUnitTypeLabel = (unitType: string) => {
    const labels: Record<string, string> = {
      per_call: '按次',
      per_1k_tokens: '按千Token',
      per_minute: '按分钟',
    };
    return labels[unitType] || unitType;
  };

  const isEditing = (model: string) => !!editMap[model];
  const isPlanEditing = (id: number) => !!editPlanMap[id];

  const totalCalls = pricingList.reduce((sum, p) => sum + (p.call_count || 0), 0);
  const totalCost = pricingList.reduce((sum, p) => sum + (p.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">积分定价管理</h1>
          <p className="text-dark-400 mt-1">管理模型积分消耗定价与充值套餐</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'pricing'
              ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white'
              : 'glass text-dark-300 hover:text-dark-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <Coins size={16} />
            模型定价
          </span>
        </button>
        <button
          onClick={() => setActiveTab('recharge')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'recharge'
              ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white'
              : 'glass text-dark-300 hover:text-dark-100'
          }`}
        >
          <span className="flex items-center gap-2">
            <CreditCard size={16} />
            充值套餐
          </span>
        </button>
      </div>

      {/* ========== 模型定价 Tab ========== */}
      {activeTab === 'pricing' && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Coins size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-100">{pricingList.length}</p>
                  <p className="text-xs text-dark-500">模型总数</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Zap size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-100">
                    {pricingList.filter((p) => p.enabled).length}
                  </p>
                  <p className="text-xs text-dark-500">已启用</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <BarChart3 size={20} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-100">{totalCalls.toLocaleString()}</p>
                  <p className="text-xs text-dark-500">总调用次数</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Settings size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-100">{categories.length}</p>
                  <p className="text-xs text-dark-500">分类数</p>
                </div>
              </div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="flex-1 min-w-64 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索模型名称..."
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/30 transition-colors text-sm"
                >
                  <option value="">全部分类</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
              {hasChanges() && (
                <button
                  onClick={handleSavePricing}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  保存更改 ({Object.keys(editMap).length})
                </button>
              )}
            </div>

            {/* 定价表格 */}
            <div className="overflow-x-auto -mx-5">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                    <th className="pb-3 px-5 font-medium">模型</th>
                    <th className="pb-3 px-5 font-medium">分类</th>
                    <th className="pb-3 px-5 font-medium">积分/单位</th>
                    <th className="pb-3 px-5 font-medium">计费方式</th>
                    <th className="pb-3 px-5 font-medium">描述</th>
                    <th className="pb-3 px-5 font-medium">调用次数</th>
                    <th className="pb-3 px-5 font-medium">总消耗</th>
                    <th className="pb-3 px-5 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-dark-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={18} className="animate-spin" />
                          加载中...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && filteredPricing.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-dark-500">
                        暂无定价配置
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredPricing.map((p) => {
                      const editing = isEditing(p.local_model);
                      const edit = editMap[p.local_model] || {};
                      const currentEnabled = editing ? (edit.enabled ?? p.enabled) : p.enabled;
                      const currentCost = editing ? (edit.cost_per_unit ?? p.cost_per_unit) : p.cost_per_unit;
                      const currentDescription = editing ? (edit.description ?? p.description) : p.description;

                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-purple-500/5 hover:bg-purple-500/5 ${editing ? 'bg-purple-500/5' : ''}`}
                        >
                          <td className="py-4 px-5">
                            <div>
                              <p className="font-medium text-dark-100">{p.display_name}</p>
                              <p className="text-xs text-dark-500 font-mono">{p.local_model}</p>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(p.category)}`}
                            >
                              {getCategoryLabel(p.category)}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                value={currentCost}
                                onChange={(e) =>
                                  updateEditField(p.local_model, 'cost_per_unit', parseInt(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1 bg-dark-900/50 border border-purple-500/20 rounded-lg text-dark-200 focus:outline-none focus:border-purple-500/40 text-sm"
                              />
                            ) : (
                              <span className="text-dark-200 font-medium">{p.cost_per_unit}</span>
                            )}
                            <span className="text-xs text-dark-500 ml-1">积分/{p.unit_label}</span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-xs text-dark-400 px-2 py-1 rounded-lg bg-dark-900/50 border border-purple-500/10">
                              {getUnitTypeLabel(p.unit_type)}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            {editing ? (
                              <input
                                type="text"
                                value={currentDescription}
                                onChange={(e) =>
                                  updateEditField(p.local_model, 'description', e.target.value)
                                }
                                className="w-32 px-2 py-1 bg-dark-900/50 border border-purple-500/20 rounded-lg text-dark-200 focus:outline-none focus:border-purple-500/40 text-sm"
                              />
                            ) : (
                              <span className="text-sm text-dark-400">{p.description || '-'}</span>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-sm text-dark-300">{(p.call_count || 0).toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-sm text-dark-300">{(p.total_cost || 0).toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-5">
                            <button
                              onClick={() => toggleEnabled(p.local_model, p.enabled)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              {currentEnabled ? (
                                <ToggleRight size={20} className="text-green-400" />
                              ) : (
                                <ToggleLeft size={20} className="text-dark-500" />
                              )}
                              <span className={`text-sm ${currentEnabled ? 'text-green-400' : 'text-dark-500'}`}>
                                {currentEnabled ? '启用' : '禁用'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========== 充值套餐 Tab ========== */}
      {activeTab === 'recharge' && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-dark-100">充值套餐管理</h3>
            {hasPlanChanges() && (
              <button
                onClick={handleSavePlans}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                保存更改 ({Object.keys(editPlanMap).length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {rechargePlans.map((plan) => {
              const editing = isPlanEditing(plan.id);
              const edit = editPlanMap[plan.id] || {};
              const currentName = editing ? (edit.name ?? plan.name) : plan.name;
              const currentCredits = editing ? (edit.credits ?? plan.credits) : plan.credits;
              const currentPrice = editing ? (edit.price_yuan ?? plan.price_yuan) : plan.price_yuan;
              const currentBonus = editing ? (edit.bonus_credits ?? plan.bonus_credits) : plan.bonus_credits;
              const currentEnabled = editing ? (edit.enabled ?? plan.enabled) : plan.enabled;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 border transition-all ${
                    editing
                      ? 'border-purple-500/30 bg-purple-500/5'
                      : 'border-purple-500/10 bg-dark-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-purple-400" />
                      <input
                        type="text"
                        value={currentName}
                        onChange={(e) => updatePlanField(plan.id, 'name', e.target.value)}
                        className={`text-sm font-medium bg-transparent border-b transition-colors focus:outline-none ${
                          editing
                            ? 'text-dark-100 border-purple-500/40'
                            : 'text-dark-300 border-transparent'
                        }`}
                      />
                    </div>
                    <button
                      onClick={() => togglePlanEnabled(plan.id, plan.enabled)}
                      className="cursor-pointer"
                    >
                      {currentEnabled ? (
                        <ToggleRight size={20} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={20} className="text-dark-500" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-dark-100">{currentPrice}</span>
                      <span className="text-sm text-dark-400">元</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <label className="text-xs text-dark-500">积分</label>
                        <input
                          type="number"
                          min={0}
                          value={currentCredits}
                          onChange={(e) => updatePlanField(plan.id, 'credits', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 mt-0.5 bg-dark-900/50 border border-purple-500/10 rounded-lg text-dark-200 focus:outline-none focus:border-purple-500/40 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-dark-500">赠送</label>
                        <input
                          type="number"
                          min={0}
                          value={currentBonus}
                          onChange={(e) => updatePlanField(plan.id, 'bonus_credits', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 mt-0.5 bg-dark-900/50 border border-purple-500/10 rounded-lg text-dark-200 focus:outline-none focus:border-purple-500/40 text-sm"
                        />
                      </div>
                    </div>

                    {currentBonus > 0 && (
                      <div className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                        赠送 {currentBonus} 积分，共 {currentCredits + currentBonus} 积分
                      </div>
                    )}

                    <div className="text-xs text-dark-500">
                      单价：{(currentPrice / (currentCredits + currentBonus)).toFixed(2)} 元/积分
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="py-12 text-center text-dark-500">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin" />
                加载中...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
