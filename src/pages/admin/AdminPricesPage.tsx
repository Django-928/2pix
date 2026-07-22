import { useState, useEffect } from 'react';
import {
  Settings,
  Search,
  RefreshCw,
  Edit2,
  X,
  DollarSign,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface TokenPrice {
  id: number;
  category: string;
  model: string;
  model_name: string;
  input_price: number;
  output_price: number;
  cost_multiplier: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function AdminPricesPage() {
  const toast = useToast();
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<TokenPrice | null>(null);
  const [formData, setFormData] = useState({
    input_price: 0,
    output_price: 0,
    cost_multiplier: 1,
    is_active: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    setLoading(true);
    try {
      const data = await api.get<TokenPrice[]>('/admin/billing/prices');
      setPrices(data);
    } catch {
      toast.error('加载价格列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (price: TokenPrice) => {
    setEditingPrice(price);
    setFormData({
      input_price: price.input_price,
      output_price: price.output_price,
      cost_multiplier: price.cost_multiplier,
      is_active: price.is_active,
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/billing/prices/${editingPrice.id}`, formData);
      setShowEditModal(false);
      loadPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (price: TokenPrice) => {
    try {
      await api.put(`/admin/billing/prices/${price.id}`, {
        is_active: price.is_active ? 0 : 1,
      });
      loadPrices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const filteredPrices = prices.filter((p) => {
    const matchSearch =
      !search ||
      p.model.toLowerCase().includes(search.toLowerCase()) ||
      p.model_name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = Array.from(new Set(prices.map((p) => p.category)));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">价格管理</h1>
          <p className="text-dark-400 mt-1">配置各模型Token价格与成本系数</p>
        </div>
        <button
          onClick={loadPrices}
          className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">{prices.length}</p>
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
                {prices.filter((p) => p.is_active).length}
              </p>
              <p className="text-xs text-dark-500">已启用</p>
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
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Settings size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">
                {prices.filter((p) => !p.is_active).length}
              </p>
              <p className="text-xs text-dark-500">已禁用</p>
            </div>
          </div>
        </div>
      </div>

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
        </div>

        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 px-5 font-medium">模型</th>
                <th className="pb-3 px-5 font-medium">分类</th>
                <th className="pb-3 px-5 font-medium">输入价格</th>
                <th className="pb-3 px-5 font-medium">输出价格</th>
                <th className="pb-3 px-5 font-medium">成本系数</th>
                <th className="pb-3 px-5 font-medium">状态</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredPrices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-500">
                    暂无价格配置
                  </td>
                </tr>
              )}
              {!loading &&
                filteredPrices.map((price) => (
                  <tr key={price.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-medium text-dark-100">{price.model_name}</p>
                        <p className="text-xs text-dark-500 font-mono">{price.model}</p>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                          price.category
                        )}`}
                      >
                        {getCategoryLabel(price.category)}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-dark-200">
                        ¥{price.input_price.toFixed(6)} / 1K tokens
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-dark-200">
                        ¥{price.output_price.toFixed(6)} / 1K tokens
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-dark-200">{price.cost_multiplier}x</span>
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggleActive(price)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        {price.is_active ? (
                          <ToggleRight size={20} className="text-green-400" />
                        ) : (
                          <ToggleLeft size={20} className="text-dark-500" />
                        )}
                        <span
                          className={`text-sm ${
                            price.is_active ? 'text-green-400' : 'text-dark-500'
                          }`}
                        >
                          {price.is_active ? '启用' : '禁用'}
                        </span>
                      </button>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleEdit(price)}
                          className="p-2 rounded-lg text-dark-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">编辑价格</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-5 space-y-4">
              <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10 mb-2">
                <p className="text-sm font-medium text-dark-200">
                  {editingPrice?.model_name}
                </p>
                <p className="text-xs text-dark-500 font-mono">{editingPrice?.model}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  输入价格 (元/1K tokens)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={formData.input_price}
                  onChange={(e) =>
                    setFormData({ ...formData, input_price: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  输出价格 (元/1K tokens)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={formData.output_price}
                  onChange={(e) =>
                    setFormData({ ...formData, output_price: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  成本系数
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.cost_multiplier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost_multiplier: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  required
                />
                <p className="text-xs text-dark-500 mt-1">
                  实际成本 = 标价 × 成本系数，用于计算平台利润
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">状态</label>
                <select
                  value={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                >
                  <option value={1}>启用</option>
                  <option value={0}>禁用</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
