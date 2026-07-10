import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Code2,
  Edit2,
  Plus,
  Save,
  Search,
  Server,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { ModelApiConfig, useSettingsStore } from '@/store/useSettingsStore';

const blankConfig: ModelApiConfig = {
  id: '',
  name: '',
  category: 'video',
  provider: '',
  officialModel: '',
  endpoint: '',
  method: 'POST',
  apiKey: '',
  headers: '{\n  "Content-Type": "application/json"\n}',
  bodyTemplate: '{\n  "model": "{{officialModel}}",\n  "prompt": "{{prompt}}",\n  "params": {}\n}',
  price: '演示预计 12-36 积分',
  successRate: 98,
  enabled: true,
  mockMode: true,
  params: 'ratio,resolution,duration,count',
};

const categoryLabels: Record<ModelApiConfig['category'], string> = {
  chat: '聊天',
  image: '图像',
  video: '视频',
  audio: '音频',
};

export default function AdminModelConfigsPage() {
  const navigate = useNavigate();
  const { modelApiConfigs, upsertModelApiConfig, deleteModelApiConfig } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [editingConfig, setEditingConfig] = useState<ModelApiConfig | null>(null);

  const stats = useMemo(
    () => ({
      total: modelApiConfigs.length,
      enabled: modelApiConfigs.filter((item) => item.enabled).length,
      mock: modelApiConfigs.filter((item) => item.mockMode).length,
      connected: modelApiConfigs.filter((item) => item.endpoint && item.apiKey && !item.mockMode).length,
    }),
    [modelApiConfigs],
  );

  const filteredConfigs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return modelApiConfigs;
    return modelApiConfigs.filter((item) =>
      [item.name, item.provider, item.officialModel, item.endpoint, item.category]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [modelApiConfigs, search]);

  const openNewConfig = () => {
    setEditingConfig({
      ...blankConfig,
      id: `custom-model-${Date.now()}`,
      name: '新视频模型',
      officialModel: 'official-model-id',
    });
  };

  const updateForm = <K extends keyof ModelApiConfig>(key: K, value: ModelApiConfig[K]) => {
    setEditingConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveConfig = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingConfig?.name.trim() || !editingConfig.officialModel.trim()) return;
    upsertModelApiConfig({
      ...editingConfig,
      id: editingConfig.id || editingConfig.officialModel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });
    setEditingConfig(null);
  };

  return (
    <div className="space-y-6">
      {/* ========== 废弃警告横幅 ========== */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
        <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-200">
            注意：此页面的配置仅保存在浏览器本地，不会影响实际API调用。
          </p>
          <p className="mt-1 text-xs text-amber-300/80">
            如需配置真实API，请前往聚合平台配置页面。
          </p>
          <button
            onClick={() => navigate('/admin/provider-config')}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition hover:bg-purple-500/20"
          >
            前往聚合平台配置
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-purple-400">MODEL API CENTER</p>
          <h1 className="mt-2 text-2xl font-bold text-dark-100">模型接口配置</h1>
          <p className="mt-1 text-sm text-dark-400">
            这里保留真实模型接口配置入口；前台会读取启用状态、价格、成功率和模拟模式。
          </p>
        </div>
        <button
          type="button"
          onClick={openNewConfig}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400"
        >
          <Plus size={16} />
          新增接口
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: '配置总数', value: stats.total, icon: Server, color: 'text-purple-400 bg-purple-500/10' },
          { label: '已启用', value: stats.enabled, icon: Zap, color: 'text-emerald-400 bg-emerald-500/10' },
          { label: '模拟兜底', value: stats.mock, icon: Activity, color: 'text-amber-400 bg-amber-500/10' },
          { label: '真实接入', value: stats.connected, icon: Code2, color: 'text-cyan-400 bg-cyan-500/10' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-100">{item.value}</p>
                  <p className="text-xs text-dark-500">{item.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-64 flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索模型、供应商、接口地址..."
              className="w-full rounded-xl border border-purple-500/10 bg-dark-900/50 py-2.5 pl-10 pr-4 text-sm text-dark-200 placeholder-dark-500 outline-none transition focus:border-purple-500/30"
            />
          </div>
          <p className="text-sm text-dark-500">当前展示 {filteredConfigs.length} 个接口</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredConfigs.map((config) => (
            <article key={config.id} className="rounded-2xl border border-purple-500/10 bg-dark-900/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300">
                      {categoryLabels[config.category]}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${config.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-dark-700 text-dark-500'}`}>
                      {config.enabled ? '已启用' : '已禁用'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${config.mockMode ? 'bg-amber-500/10 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'}`}>
                      {config.mockMode ? '模拟模式' : '真实接口'}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-dark-100">{config.name}</h2>
                  <p className="mt-1 font-mono text-xs text-dark-500">{config.officialModel}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingConfig(config)}
                    className="rounded-lg p-2 text-dark-500 transition hover:bg-purple-500/10 hover:text-purple-300"
                    title="编辑"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteModelApiConfig(config.id)}
                    className="rounded-lg p-2 text-dark-500 transition hover:bg-red-500/10 hover:text-red-300"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-dark-500">供应商</p>
                  <p className="mt-1 text-dark-200">{config.provider || '未填写'}</p>
                </div>
                <div>
                  <p className="text-dark-500">成功率 / 价格</p>
                  <p className="mt-1 text-dark-200">{config.successRate}% · {config.price}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-dark-500">Endpoint</p>
                  <p className="mt-1 truncate font-mono text-xs text-dark-300">{config.endpoint || '未配置，前台使用模拟兜底'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={saveConfig} className="glass max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-purple-500/10 bg-dark-900/90 p-5 backdrop-blur-xl">
              <div>
                <h2 className="text-lg font-semibold text-dark-100">编辑模型接口</h2>
                <p className="text-xs text-dark-500">API Key 仅保存在本地演示配置中，后续可迁移到服务端加密保存。</p>
              </div>
              <button type="button" onClick={() => setEditingConfig(null)} className="rounded-lg p-2 text-dark-500 hover:bg-dark-700 hover:text-dark-200">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-dark-300">展示名称</span>
                <input value={editingConfig.name} onChange={(e) => updateForm('name', e.target.value)} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">官方模型 ID</span>
                <input value={editingConfig.officialModel} onChange={(e) => updateForm('officialModel', e.target.value)} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 font-mono text-sm text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">分类</span>
                <select value={editingConfig.category} onChange={(e) => updateForm('category', e.target.value as ModelApiConfig['category'])} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 text-dark-200 outline-none focus:border-purple-500/30">
                  <option value="video">视频</option>
                  <option value="image">图像</option>
                  <option value="chat">聊天</option>
                  <option value="audio">音频</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">供应商</span>
                <input value={editingConfig.provider} onChange={(e) => updateForm('provider', e.target.value)} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-dark-300">Endpoint</span>
                <input value={editingConfig.endpoint} onChange={(e) => updateForm('endpoint', e.target.value)} placeholder="https://api.example.com/v1/video/generate" className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 font-mono text-sm text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">Method</span>
                <select value={editingConfig.method} onChange={(e) => updateForm('method', e.target.value as ModelApiConfig['method'])} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 text-dark-200 outline-none focus:border-purple-500/30">
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">API Key</span>
                <input value={editingConfig.apiKey} onChange={(e) => updateForm('apiKey', e.target.value)} placeholder="sk-..." className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 font-mono text-sm text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">价格说明</span>
                <input value={editingConfig.price} onChange={(e) => updateForm('price', e.target.value)} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-dark-300">成功率展示</span>
                <input type="number" min={0} max={100} value={editingConfig.successRate} onChange={(e) => updateForm('successRate', Number(e.target.value))} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-dark-300">参数字段</span>
                <input value={editingConfig.params} onChange={(e) => updateForm('params', e.target.value)} placeholder="ratio,resolution,duration,count" className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 font-mono text-sm text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-dark-300">Headers JSON</span>
                <textarea rows={5} value={editingConfig.headers} onChange={(e) => updateForm('headers', e.target.value)} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 font-mono text-xs text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-dark-300">Body 模板</span>
                <textarea rows={7} value={editingConfig.bodyTemplate} onChange={(e) => updateForm('bodyTemplate', e.target.value)} className="w-full rounded-xl border border-purple-500/10 bg-dark-900/60 px-3 py-2.5 font-mono text-xs text-dark-200 outline-none focus:border-purple-500/30" />
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <label className="flex items-center gap-2 rounded-xl border border-purple-500/10 bg-dark-900/50 px-4 py-3 text-sm text-dark-300">
                  <input type="checkbox" checked={editingConfig.enabled} onChange={(e) => updateForm('enabled', e.target.checked)} />
                  前台启用
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-purple-500/10 bg-dark-900/50 px-4 py-3 text-sm text-dark-300">
                  <input type="checkbox" checked={editingConfig.mockMode} onChange={(e) => updateForm('mockMode', e.target.checked)} />
                  保留模拟兜底
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-purple-500/10 bg-dark-900/90 p-5 backdrop-blur-xl">
              <button type="button" onClick={() => setEditingConfig(null)} className="rounded-xl border border-purple-500/10 px-4 py-2.5 text-sm text-dark-300 hover:bg-dark-700">
                取消
              </button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-400">
                <Save size={16} />
                保存配置
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
