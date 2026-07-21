import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  PlugZap,
  Download,
  Image,
  Database,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';
import { aiModels as builtinModels } from '@/data/models';

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

/** Provider model mapping from admin_configs */
interface ProviderModel {
  localModel: string;
  upstreamModel: string;
  category: string;
  enabled: boolean;
}

interface ProviderItem {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  models: ProviderModel[];
}

interface ProviderConfig {
  activeProvider: string;
  providers: ProviderItem[];
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

/** 预设模型图标 */
const PRESET_ICONS: { icon: string; label: string }[] = [
  { icon: '🤖', label: '通用 AI' },
  { icon: '💬', label: 'ChatGPT' },
  { icon: '🦜', label: 'Claude' },
  { icon: '✨', label: 'Gemini' },
  { icon: '🎨', label: 'DALL-E' },
  { icon: '🎬', label: 'Sora' },
  { icon: '🎵', label: 'Suno' },
  { icon: '🔥', label: 'MidJourney' },
  { icon: '🎯', label: 'Stable Diffusion' },
  { icon: '📸', label: '图像模型' },
  { icon: '📹', label: '视频模型' },
  { icon: '🔊', label: '音频模型' },
  { icon: '🌟', label: '新品' },
  { icon: '🚀', label: '推荐' },
  { icon: '🧠', label: '大语言模型' },
  { icon: '🖼️', label: '生成模型' },
];

/** 从 localModel 推断友好的中文名称 */
function inferModelName(localModel: string): string {
  const parts = localModel.split(/[-_]/);
  const words = parts.map((part) => {
    const lower = part.toLowerCase();
    // 已知前缀映射
    const prefixMap: Record<string, string> = {
      gpt: 'GPT', claude: 'Claude', gemini: 'Gemini', llama: 'Llama',
      qwen: 'Qwen', deepseek: 'DeepSeek', chatglm: 'ChatGLM', baichuan: 'Baichuan',
      dall: 'DALL-E', midjourney: 'MidJourney', stable: 'Stable', diffusion: 'Diffusion',
      sora: 'Sora', kling: '可灵', seedance: 'Seedance', vidu: 'Vidu', runway: 'Runway',
      pika: 'Pika', suno: 'Suno', udio: 'Udio', elevenlabs: 'ElevenLabs',
      whisper: 'Whisper', tts: 'TTS', grok: 'Grok', o1: 'O1', o3: 'O3',
      o4: 'O4', gpt4: 'GPT-4', gpt5: 'GPT-5',
    };
    for (const [key, value] of Object.entries(prefixMap)) {
      if (lower.startsWith(key)) return value;
    }
    // 数字版本号
    if (/^\d+(\.\d+)*$/.test(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  });
  return words.join(' ');
}

/** 从 localModel 推断默认图标 */
function inferModelIcon(localModel: string, category: string): string {
  const lower = localModel.toLowerCase();
  if (lower.includes('claude')) return '🦜';
  if (lower.includes('gpt') || lower.includes('chatgpt')) return '💬';
  if (lower.includes('gemini')) return '✨';
  if (lower.includes('llama')) return '🦙';
  if (lower.includes('dall') || lower.includes('image')) return '🎨';
  if (lower.includes('sora') || lower.includes('video') || lower.includes('kling') || lower.includes('seedance') || lower.includes('vidu') || lower.includes('runway') || lower.includes('pika')) return '🎬';
  if (lower.includes('suno') || lower.includes('udio') || lower.includes('audio') || lower.includes('tts') || lower.includes('whisper')) return '🎵';
  if (lower.includes('stable') || lower.includes('diffusion') || lower.includes('midjourney')) return '🔥';
  if (lower.includes('grok')) return '🚀';
  if (lower.includes('deepseek')) return '🧠';
  if (lower.includes('qwen')) return '💬';
  if (category === 'image') return '📸';
  if (category === 'video') return '📹';
  if (category === 'audio') return '🔊';
  return '🤖';
}

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
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<{ count: number; models: { localModel: string; category: string }[] } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [iconEditModel, setIconEditModel] = useState<Model | null>(null);
  const [iconEditValue, setIconEditValue] = useState('');
  const [iconSaving, setIconSaving] = useState(false);
  const [syncingBuiltin, setSyncingBuiltin] = useState(false);

  useEffect(() => {
    loadModels();
    loadProviderConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryTab]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryTab) params.append('category', categoryTab);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<Model[]>(`/admin/models${query}`);
      // api 工具已自动解包 data.data，res 直接就是模型数组
      setModels(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderConfig = async () => {
    try {
      const data = await api.get<{ value: ProviderConfig }>('/admin/configs/providers');
      setProviderConfig(data.value);
    } catch {
      // Provider config not available - silently ignore
    }
  };

  /** Build a lookup: localModel -> { providerName, upstreamModel } for enabled providers */
  const providerMapping = useMemo(() => {
    const map: Record<string, { providerName: string; upstreamModel: string }[]> = {};
    if (!providerConfig) return map;
    for (const provider of providerConfig.providers) {
      if (!provider.enabled) continue;
      for (const m of provider.models) {
        if (!m.enabled) continue;
        if (!map[m.localModel]) map[m.localModel] = [];
        map[m.localModel].push({ providerName: provider.name || provider.id, upstreamModel: m.upstreamModel });
      }
    }
    return map;
  }, [providerConfig]);

  /** 检测 provider 中有但 ai_models 表中还没有的模型 */
  const importableModels = useMemo(() => {
    if (!providerConfig) return [];
    const existingIds = new Set(models.map((m) => m.id));
    const importable: { localModel: string; category: string }[] = [];
    for (const provider of providerConfig.providers) {
      if (!provider.enabled) continue;
      for (const m of provider.models) {
        if (!m.enabled) continue;
        if (!existingIds.has(m.localModel) && !importable.some((i) => i.localModel === m.localModel)) {
          importable.push({ localModel: m.localModel, category: m.category });
        }
      }
    }
    return importable;
  }, [providerConfig, models]);

  /** 自动提示导入 */
  useEffect(() => {
    if (importableModels.length > 0 && !syncPrompt && !syncing) {
      setSyncPrompt({ count: importableModels.length, models: importableModels });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importableModels.length]);

  const handleImportFromProvider = async () => {
    if (!syncPrompt) return;
    setSyncing(true);
    try {
      let added = 0;
      for (const m of syncPrompt.models) {
        try {
          await api.post('/admin/models', {
            id: m.localModel,
            name: inferModelName(m.localModel),
            description: '',
            icon: inferModelIcon(m.localModel, m.category),
            category: m.category,
            sort_order: 0,
            is_new: 1,
            is_hot: 0,
          });
          added++;
        } catch {
          // 模型可能已存在，跳过
        }
      }
      toast.success(`成功导入 ${added} 个模型`);
      setSyncPrompt(null);
      loadModels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setSyncing(false);
    }
  };

  /** 从内置模型库 (src/data/models.ts) 同步到数据库 */
  const handleSyncBuiltinModels = async () => {
    setSyncingBuiltin(true);
    try {
      const existingIds = new Set(models.map((m) => m.id));
      let added = 0;
      let skipped = 0;
      for (const m of builtinModels) {
        if (existingIds.has(m.id)) {
          skipped++;
          continue;
        }
        try {
          await api.post('/admin/models', {
            id: m.id,
            name: m.name,
            description: m.description || '',
            icon: m.icon || '',
            category: m.category,
            status: 'active',
            sort_order: 0,
            is_new: m.isNew ? 1 : 0,
            is_hot: m.isHot ? 1 : 0,
          });
          added++;
        } catch {
          // 模型可能已存在，跳过
        }
      }
      if (added > 0) {
        toast.success(`同步完成：新增 ${added} 个模型${skipped > 0 ? `，跳过 ${skipped} 个已存在` : ''}`);
      } else {
        toast.info(`所有 ${skipped} 个内置模型均已存在，无需同步`);
      }
      loadModels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '同步内置模型失败');
    } finally {
      setSyncingBuiltin(false);
    }
  };

  const handleOpenIconEdit = (model: Model) => {
    setIconEditModel(model);
    setIconEditValue(model.icon || '');
  };

  const handleSaveIcon = async () => {
    if (!iconEditModel) return;
    setIconSaving(true);
    try {
      await api.put(`/admin/models/${iconEditModel.id}`, { icon: iconEditValue });
      toast.success('图标已更新');
      setIconEditModel(null);
      loadModels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新图标失败');
    } finally {
      setIconSaving(false);
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
          is_new: formData.is_new ? 1 : 0,
          is_hot: formData.is_hot ? 1 : 0,
        });
      } else {
        await api.post('/admin/models', {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          icon: formData.icon || '✨',
          category: formData.category,
          sort_order: formData.sort_order,
          is_new: formData.is_new ? 1 : 0,
          is_hot: formData.is_hot ? 1 : 0,
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncBuiltinModels}
            disabled={syncingBuiltin}
            className="flex items-center gap-2 px-4 py-2.5 glass border border-purple-500/20 text-purple-300 font-medium rounded-xl hover:bg-purple-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="将前端内置的 87 个 KIE 模型同步到数据库"
          >
            <Database size={18} className={syncingBuiltin ? 'animate-pulse' : ''} />
            {syncingBuiltin ? '同步中...' : '同步内置模型'}
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            <Plus size={18} />
            新增模型
          </button>
        </div>
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
            onClick={() => { loadModels(); loadProviderConfig(); }}
            className="p-2.5 glass rounded-xl text-dark-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto -mx-5">

        {/* 自动同步提示横幅 */}
        {syncPrompt && (
          <div className="mb-5 flex items-center gap-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-4">
            <Download size={20} className="flex-shrink-0 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-200">
                检测到 {syncPrompt.count} 个已配置的 Provider 模型
              </p>
              <p className="mt-1 text-xs text-purple-300/80">
                这些模型在 Provider 配置中已启用但尚未导入模型管理表，是否一键导入？
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleImportFromProvider}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 disabled:opacity-50"
              >
                {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                一键导入
              </button>
              <button
                onClick={() => setSyncPrompt(null)}
                className="px-4 py-2.5 rounded-xl text-sm text-dark-400 hover:text-dark-200 transition-colors"
              >
                稍后再说
              </button>
            </div>
          </div>
        )}
        <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-dark-400 border-b border-purple-500/10">
                <th className="pb-3 px-5 font-medium">图标</th>
                <th className="pb-3 px-5 font-medium">ID</th>
                <th className="pb-3 px-5 font-medium">名称</th>
                <th className="pb-3 px-5 font-medium">描述</th>
                <th className="pb-3 px-5 font-medium">分类</th>
                <th className="pb-3 px-5 font-medium">状态</th>
                <th className="pb-3 px-5 font-medium">Provider</th>
                <th className="pb-3 px-5 font-medium">排序</th>
                <th className="pb-3 px-5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={18} className="animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredModels.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-500">
                    暂无模型数据
                  </td>
                </tr>
              )}
              {!loading && filteredModels.map((model) => {
                const mappings = providerMapping[model.id];
                const hasMapping = mappings && mappings.length > 0;
                return (
                  <tr key={model.id} className="border-b border-purple-500/5 hover:bg-purple-500/5">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        {model.icon && model.icon.startsWith('http') ? (
                          <img src={model.icon} alt={model.name} className="w-8 h-8 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <span className="text-2xl">{model.icon || '✨'}</span>
                        )}
                        <button
                          onClick={() => handleOpenIconEdit(model)}
                          className="p-1 rounded-lg text-dark-600 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="修改图标"
                        >
                          <Image size={14} />
                        </button>
                      </div>
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
                    {/* Provider 接入状态 */}
                    <td className="py-4 px-5">
                      {hasMapping ? (
                        <div className="flex flex-col gap-1">
                          {mappings.slice(0, 2).map((m, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              title={`${m.providerName}: ${model.id} -> ${m.upstreamModel}`}
                            >
                              <PlugZap size={10} />
                              {m.providerName}
                            </span>
                          ))}
                          {mappings.length > 2 && (
                            <span className="text-[10px] text-dark-500">+{mappings.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          未接入
                        </span>
                      )}
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
                );
              })}
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

      {/* 图标编辑弹窗 */}
      {iconEditModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-purple-500/10">
              <h3 className="text-lg font-semibold text-dark-100">
                修改图标 - {iconEditModel.name}
              </h3>
              <button
                onClick={() => setIconEditModel(null)}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-300 hover:bg-dark-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 当前图标预览 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-dark-900/50 border border-purple-500/20">
                  <span className="text-3xl">{iconEditValue || '✨'}</span>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-dark-300 mb-2">图标字符或 URL</label>
                  <input
                    type="text"
                    value={iconEditValue}
                    onChange={(e) => setIconEditValue(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-200 text-center text-xl focus:outline-none focus:border-purple-500/40 transition-colors"
                    placeholder="输入 emoji 或图标 URL"
                  />
                </div>
              </div>

              {/* 预设图标选择 */}
              <div>
                <p className="text-sm font-medium text-dark-300 mb-2">预设图标</p>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_ICONS.map((preset) => (
                    <button
                      key={preset.icon}
                      onClick={() => setIconEditValue(preset.icon)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        iconEditValue === preset.icon
                          ? 'border-purple-500/50 bg-purple-500/15'
                          : 'border-purple-500/10 hover:border-purple-500/30 hover:bg-purple-500/5'
                      }`}
                      title={preset.label}
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-[9px] text-dark-500 truncate w-full text-center">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-500/10">
                <button
                  type="button"
                  onClick={() => setIconEditModel(null)}
                  className="px-4 py-2.5 glass rounded-xl text-dark-300 hover:text-dark-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveIcon}
                  disabled={iconSaving}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {iconSaving && <RefreshCw size={16} className="animate-spin" />}
                  保存图标
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
