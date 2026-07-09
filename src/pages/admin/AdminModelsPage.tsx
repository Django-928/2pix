import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface Model {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: string;
  sort_order: number;
  is_new: number;
  is_hot: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'chat', label: '聊天' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  chat: '聊天',
  image: '图片',
  video: '视频',
  audio: '音频',
};

const CATEGORY_COLORS: Record<string, string> = {
  chat: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  image: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  video: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  audio: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  active: '已上线',
  inactive: '已下线',
};

interface ModelFormData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sort_order: number;
  is_new: boolean;
  is_hot: boolean;
}

const emptyFormData: ModelFormData = {
  id: '',
  name: '',
  description: '',
  icon: '',
  category: 'chat',
  sort_order: 0,
  is_new: false,
  is_hot: false,
};

export default function AdminModelsPage() {
  const toast = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryTab, setCategoryTab] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Model | null>(null);
  const [formData, setFormData] = useState<ModelFormData>({ ...emptyFormData });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryTab]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryTab) params.append('category', categoryTab);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<{ success: boolean; data: Model[] }>(`/admin/models${query}`);
      setModels(res.data || []);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ ...emptyFormData });
    setIsEditing(false);
    setEditingModel(null);
    setShowModal(true);
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      id: model.id,
      name: model.name,
      description: model.description || '',
      icon: model.icon || '',
      category: model.category,
      sort_order: model.sort_order || 0,
      is_new: !!model.is_new,
      is_hot: !!model.is_hot,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && editingModel) {
        await api.put(`/admin/models/${editingModel.id}`, {
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          category: formData.category,
          sort_order: formData.sort_order,
          is_new: formData.is_new,
          is_hot: formData.is_hot,
        });
      } else {
        await api.post('/admin/models', {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          icon: formData.icon || '✨',
          category: formData.category,
          sort_order: formData.sort_order,
          is_new: formData.is_new,
          is_hot: formData.is_hot,
        });
      }
      setShowModal(false);
      loadModels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isEditing ? '更新失败' : '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (model: Model) => {
    const newStatus = model.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? '上线' : '下线';
    if (!confirm(`确定要将模型 "${model.name}" ${actionText}吗？`)) return;
    try {
      await api.put(`/admin/models/${model.id}`, { status: newStatus });
      loadModels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${actionText}操作失败`);
    }
  };

  const handleDelete = async (model: Model) => {
    if (!confirm(`确定要删除模型 "${model.name}" 吗？删除后将变为下线状态。`)) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/models/${model.id}`);
      setDeleteConfirm(null);
      loadModels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 搜索过滤（前端过滤）
  const filteredModels = models.filter((model) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      model.id.toLowerCase().includes(s) ||
      model.name.toLowerCase().includes(s) ||
      (model.description || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">模型管理</h1>
          <p className="text-dark-400 mt-1">管理平台所有 AI 模型</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
        >
          <Plus size={18} />
          新增模型
        </button>
      </div>

      <div className="glass rounded-2xl p-5">
        {/* 分类 Tab + 搜索栏 */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-1 bg-dark-900/50 border border-purple-500/10 rounded-xl p-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryTab(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoryTab === cat.value
                    ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-purple-500/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索模型 ID、名称、描述..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900/50 border border-purple-500/10 rounded-xl text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
            />
          </div>
          <button
            onClick={loadModels}
            className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 px-5 font-medium">图标</th>
                <th className="pb-3 px-5 font-medium">ID</th>
                <th className="pb-3 px-5 font-medium">名称</th>
                <th className="pb-3 px-5 font-medium">描述</th>
                <th className="pb-3 px-5 font-medium">分类</th>
                <th className="pb-3 px-5 font-medium">状态</th>
                <th className="pb-3 px-5 font-medium">排序</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
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
              {!loading && filteredModels.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-500">
                    暂无模型数据
                  </td>
                </tr>
              )}
              {!loading && filteredModels.map((model) => (
                <tr key={model.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                  <td className="py-4 px-5">
                    <span className="text-2xl">{model.icon || '✨'}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-mono text-sm text-dark-300">{model.id}</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-100">{model.name}</span>
                      {model.is_new ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          NEW
                        </span>
                      ) : null}
                      {model.is_hot ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          HOT
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm text-dark-400 line-clamp-1 max-w-[200px] block">
                      {model.description || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[model.category] || 'bg-dark-500/10 text-dark-400'}`}>
                      {CATEGORY_LABELS[model.category] || model.category}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        model.status === 'active'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}
                    >
                      {STATUS_LABELS[model.status] || model.status}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm text-dark-300">{model.sort_order ?? 0}</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(model)}
                        className="p-2 rounded-lg text-dark-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(model)}
                        className="p-2 rounded-lg text-dark-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        title={model.status === 'active' ? '下线' : '上线'}
                      >
                        {model.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(model)}
                        className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredModels.length > 0 && !loading && (
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-purple-500/10">
            <p className="text-sm text-dark-400">
              共 {filteredModels.length} 个模型
            </p>
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">
                {isEditing ? '编辑模型' : '新增模型'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* ID */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">模型 ID *</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 font-mono focus:outline-none focus:border-purple-500/40 transition-colors"
                  placeholder="例如 gpt-image-2"
                  required={!isEditing}
                  disabled={isEditing}
                />
                {isEditing && (
                  <p className="text-xs text-dark-500 mt-1">模型 ID 创建后不可修改</p>
                )}
              </div>

              {/* 名称 + 图标 */}
              <div className="grid grid-cols-[1fr_80px] gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                    placeholder="模型显示名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">图标</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 text-center text-xl focus:outline-none focus:border-purple-500/40 transition-colors"
                    placeholder="✨"
                  />
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors resize-none"
                  placeholder="模型功能描述"
                />
              </div>

              {/* 分类 + 排序 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">分类 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                  >
                    <option value="chat">聊天</option>
                    <option value="image">图片</option>
                    <option value="video">视频</option>
                    <option value="audio">音频</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">排序值</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 focus:outline-none focus:border-purple-500/40 transition-colors"
                    placeholder="0"
                  />
                  <p className="text-xs text-dark-500 mt-1">数值越小越靠前</p>
                </div>
              </div>

              {/* 标签开关 */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 px-4 py-3 bg-dark-900/50 border border-purple-500/20 rounded-xl cursor-pointer hover:border-purple-500/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_new}
                    onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                    className="w-4 h-4 rounded border-purple-500/40 text-purple-500 focus:ring-purple-500/30 bg-dark-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-dark-200">新品标记</p>
                    <p className="text-xs text-dark-500">在列表中显示 NEW 标签</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 bg-dark-900/50 border border-purple-500/20 rounded-xl cursor-pointer hover:border-purple-500/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_hot}
                    onChange={(e) => setFormData({ ...formData, is_hot: e.target.checked })}
                    className="w-4 h-4 rounded border-purple-500/40 text-purple-500 focus:ring-purple-500/30 bg-dark-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-dark-200">热门标记</p>
                    <p className="text-xs text-dark-500">在列表中显示 HOT 标签</p>
                  </div>
                </label>
              </div>

              {/* 按钮 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isEditing ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">确认删除</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-dark-300">
                确定要删除模型 <span className="font-semibold text-dark-100">"{deleteConfirm.name}"</span> 吗？
              </p>
              <p className="text-sm text-dark-500">
                删除后模型状态将变为下线，不会立即从数据库移除。
              </p>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
