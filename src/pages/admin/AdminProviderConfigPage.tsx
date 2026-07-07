import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save, Server, Trash2, Zap } from 'lucide-react';
import api from '@/utils/api';

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
  timeoutSeconds: number;
  costMultiplier: number;
  models: ProviderModel[];
}

interface ProviderConfig {
  activeProvider: string;
  providers: ProviderItem[];
}

const emptyProvider: ProviderItem = {
  id: '',
  name: '',
  enabled: false,
  baseUrl: '',
  apiKey: '',
  timeoutSeconds: 120,
  costMultiplier: 1,
  models: [],
};

export default function AdminProviderConfigPage() {
  const [config, setConfig] = useState<ProviderConfig>({ activeProvider: 'kie.ai', providers: [] });
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const selectedProvider = config.providers.find((item) => item.id === selectedId) || config.providers[0] || emptyProvider;

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ value: ProviderConfig }>('/admin/configs/providers');
      setConfig(data.value);
      setSelectedId(data.value.providers[0]?.id || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig().catch((error) => setNotice(error instanceof Error ? error.message : '加载配置失败'));
  }, []);

  const updateProvider = (patch: Partial<ProviderItem>) => {
    setConfig((prev) => ({
      ...prev,
      providers: prev.providers.map((item) => (item.id === selectedProvider.id ? { ...item, ...patch } : item)),
    }));
  };

  const updateModel = (index: number, patch: Partial<ProviderModel>) => {
    updateProvider({
      models: selectedProvider.models.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const addProvider = () => {
    const id = `provider-${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      providers: [
        ...prev.providers,
        {
          ...emptyProvider,
          id,
          name: '新聚合平台',
          baseUrl: 'https://api.example.com',
        },
      ],
    }));
    setSelectedId(id);
  };

  const removeProvider = (id: string) => {
    setConfig((prev) => {
      const providers = prev.providers.filter((item) => item.id !== id);
      setSelectedId(providers[0]?.id || '');
      return { ...prev, providers };
    });
  };

  const addModel = () => {
    updateProvider({
      models: [
        ...selectedProvider.models,
        { localModel: 'gpt-image-2', upstreamModel: 'upstream-model-id', category: 'image', enabled: true },
      ],
    });
  };

  const removeModel = (index: number) => {
    updateProvider({ models: selectedProvider.models.filter((_, i) => i !== index) });
  };

  const saveConfig = async () => {
    setSaving(true);
    setNotice('');
    try {
      await api.put('/admin/configs/providers', { value: config });
      setNotice('聚合平台配置已保存');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none transition focus:border-purple-500/30';
  const labelClass = 'space-y-2 text-sm text-dark-300';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-purple-400">PROVIDER CENTER</p>
          <h1 className="mt-2 text-2xl font-bold text-dark-100">聚合平台配置</h1>
          <p className="mt-1 text-sm text-dark-400">配置 kie.ai 等上游聚合平台，后续模型调用会通过这里的映射和倍率结算。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addProvider} className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 px-4 py-2.5 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/10">
            <Plus size={16} />
            新增平台
          </button>
          <button
            onClick={saveConfig}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 disabled:opacity-50"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            保存配置
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.includes('保存') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
          {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <Server size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">{config.providers.length}</p>
              <p className="text-xs text-dark-500">平台数量</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-dark-100">{config.providers.filter((item) => item.enabled).length}</p>
          <p className="text-xs text-dark-500">已启用平台</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
              <Zap size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-dark-100">{config.activeProvider}</p>
              <p className="text-xs text-dark-500">默认平台</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass rounded-2xl p-3">
          {config.providers.length === 0 ? (
            <div className="p-4 text-sm text-dark-500">暂无平台，请新增。</div>
          ) : (
            config.providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedId(provider.id)}
                className={`mb-2 w-full rounded-xl p-3 text-left transition ${selectedProvider.id === provider.id ? 'bg-purple-500/15 text-purple-200' : 'text-dark-400 hover:bg-dark-700/50 hover:text-dark-200'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{provider.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${provider.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-dark-700 text-dark-500'}`}>
                    {provider.enabled ? '启用' : '停用'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs opacity-70">{provider.baseUrl}</p>
              </button>
            ))
          )}
        </aside>

        {selectedProvider.id && (
          <section className="space-y-5">
            <div className="glass rounded-2xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark-100">平台基础信息</h2>
                <button onClick={() => removeProvider(selectedProvider.id)} className="rounded-lg p-2 text-dark-500 transition hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>平台 ID<input className={inputClass} value={selectedProvider.id} onChange={(e) => updateProvider({ id: e.target.value })} /></label>
                <label className={labelClass}>平台名称<input className={inputClass} value={selectedProvider.name} onChange={(e) => updateProvider({ name: e.target.value })} /></label>
                <label className={`${labelClass} md:col-span-2`}>Base URL<input className={inputClass} value={selectedProvider.baseUrl} onChange={(e) => updateProvider({ baseUrl: e.target.value })} /></label>
                <label className={`${labelClass} md:col-span-2`}>API Key
                  <input type="password" className={inputClass} value={selectedProvider.apiKey} onChange={(e) => updateProvider({ apiKey: e.target.value })} placeholder="粘贴 API Key，留空保留原密钥" />
                </label>
                <label className={labelClass}>超时时间（秒）<input type="number" className={inputClass} value={selectedProvider.timeoutSeconds} onChange={(e) => updateProvider({ timeoutSeconds: Number(e.target.value) })} /></label>
                <label className={labelClass}>成本倍率<input type="number" step="0.01" className={inputClass} value={selectedProvider.costMultiplier} onChange={(e) => updateProvider({ costMultiplier: Number(e.target.value) })} /></label>
                <label className="flex items-center gap-2 text-sm text-dark-300">
                  <input type="checkbox" checked={selectedProvider.enabled} onChange={(e) => updateProvider({ enabled: e.target.checked })} />
                  启用该平台
                </label>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-dark-100">模型映射</h2>
                  <p className="mt-1 text-xs text-dark-500">把前台模型 ID 映射到 kie.ai 等上游模型 ID。</p>
                </div>
                <button onClick={addModel} className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 px-3 py-2 text-sm text-purple-300 transition hover:bg-purple-500/10">
                  <Plus size={16} />
                  添加映射
                </button>
              </div>
              <div className="space-y-3">
                {selectedProvider.models.map((model, index) => (
                  <div key={`${model.localModel}-${index}`} className="grid gap-3 rounded-2xl border border-purple-500/10 bg-dark-900/40 p-4 md:grid-cols-[1fr_1fr_130px_80px_40px]">
                    <input className={inputClass} value={model.localModel} onChange={(e) => updateModel(index, { localModel: e.target.value })} placeholder="本地模型 ID" />
                    <input className={inputClass} value={model.upstreamModel} onChange={(e) => updateModel(index, { upstreamModel: e.target.value })} placeholder="上游模型 ID" />
                    <select className={inputClass} value={model.category} onChange={(e) => updateModel(index, { category: e.target.value })}>
                      <option value="chat">聊天</option>
                      <option value="image">图像</option>
                      <option value="video">视频</option>
                      <option value="audio">音频</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-dark-300">
                      <input type="checkbox" checked={model.enabled} onChange={(e) => updateModel(index, { enabled: e.target.checked })} />
                      启用
                    </label>
                    <button onClick={() => removeModel(index)} className="rounded-lg p-2 text-dark-500 transition hover:bg-red-500/10 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
