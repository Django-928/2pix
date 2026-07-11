import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save, Server, Trash2, Zap, Download, CheckCircle2, Wifi, Loader2, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
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

type ConnectionStatus = null | { success: boolean; modelCount?: number; latency?: number; error?: string };

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

/** Compute the display status for a provider card */
function getProviderStatus(provider: ProviderItem): 'configured' | 'incomplete' | 'disabled' {
  if (!provider.enabled) return 'disabled';
  if (provider.apiKey && provider.baseUrl) return 'configured';
  return 'incomplete';
}

const CATEGORY_LABELS: Record<string, string> = {
  chat: '聊天',
  image: '图像',
  video: '视频',
  audio: '音频',
};

export default function AdminProviderConfigPage() {
  const toast = useToast();
  const [config, setConfig] = useState<ProviderConfig>({ activeProvider: 'kie.ai', providers: [] });
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; added: number; existing: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});

  const selectedProvider = config.providers.find((item) => item.id === selectedId) || config.providers[0] || emptyProvider;

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ value: ProviderConfig }>('/admin/configs/providers');
      setConfig(data.value);
      setSelectedId(data.value.providers[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
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
      toast.success('聚合平台配置已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const syncModels = async () => {
    if (!selectedProvider.id || !selectedProvider.baseUrl || !selectedProvider.apiKey) {
      toast.warning('请先填写 Base URL 和 API Key，再同步模型');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    setNotice('');
    try {
      const data = await api.post<{ success: boolean; data: { total: number; added: number; existing: number; models: ProviderModel[] } }>(
        '/admin/configs/providers/sync-models',
        { providerId: selectedProvider.id },
      );
      setSyncResult({ total: data.data.total, added: data.data.added, existing: data.data.existing });
      toast.success(`同步成功：共 ${data.data.total} 个模型，新增 ${data.data.added} 个，已存在 ${data.data.existing} 个`);
      // 重新加载配置以获取同步后的模型列表
      await loadConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const testConnection = async () => {
    if (!selectedProvider.id || !selectedProvider.baseUrl || !selectedProvider.apiKey) {
      setConnectionStatus((prev) => ({ ...prev, [selectedProvider.id]: { success: false, error: '请先填写 Base URL 和 API Key' } }));
      return;
    }
    setTesting(true);
    try {
      const data = await api.post<{ success: boolean; modelCount?: number; latency?: number; error?: string }>(
        '/admin/configs/providers/test-connection',
        { providerId: selectedProvider.id },
      );
      setConnectionStatus((prev) => ({ ...prev, [selectedProvider.id]: { success: true, modelCount: data.modelCount, latency: data.latency } }));
      toast.success(`连接成功！共发现 ${data.modelCount} 个可用模型`);
    } catch (error) {
      let msg = error instanceof Error ? error.message : '测试连接失败';
      if (msg.includes('DOCTYPE') || msg.includes('<')) {
        msg = 'Base URL 可能不正确，该地址返回了网页而非API响应。请确认API地址。';
      }
      setConnectionStatus((prev) => ({ ...prev, [selectedProvider.id]: { success: false, error: msg } }));
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none transition focus:border-purple-500/30';
  const labelClass = 'space-y-2 text-sm text-dark-300';

  const statusConfig = {
    configured: { label: '已配置', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    incomplete: { label: '未配置', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    disabled: { label: '已禁用', bg: 'bg-dark-700/50', text: 'text-dark-500', border: 'border-dark-600/50', dot: 'bg-dark-500' },
  };

  return (
    <div className="space-y-6">
      {/* ========== 醒目的提示横幅 ========== */}
      <div className="flex items-start gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-4">
        <Info size={20} className="mt-0.5 flex-shrink-0 text-purple-400" />
        <div>
          <p className="text-sm font-semibold text-purple-200">
            这是唯一真正生效的 API 配置入口
          </p>
          <p className="mt-1 text-xs text-purple-300/80">
            此页面的配置将保存到服务端 admin_configs 表，直接控制实际的 API 调用、模型映射和成本倍率。其他页面的配置仅作展示用途，不会影响线上 API 行为。
          </p>
        </div>
      </div>

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
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.includes('保存') || notice.includes('同步成功') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
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
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">{config.providers.filter((p) => getProviderStatus(p) === 'configured').length}</p>
              <p className="text-xs text-dark-500">已配置平台</p>
            </div>
          </div>
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
            config.providers.map((provider) => {
              const status = connectionStatus[provider.id];
              const pStatus = getProviderStatus(provider);
              const sc = statusConfig[pStatus];
              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedId(provider.id)}
                  className={`mb-2 w-full rounded-xl p-3 text-left transition ${selectedProvider.id === provider.id ? 'bg-purple-500/15 text-purple-200' : 'text-dark-400 hover:bg-dark-700/50 hover:text-dark-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* 状态指示灯 */}
                      <span className={`inline-block h-2 w-2 rounded-full ${sc.dot}`} />
                      <span className="text-sm font-medium">{provider.name || provider.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* 已测试指示 */}
                      {status && (
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.success ? 'bg-cyan-400' : 'bg-orange-400'}`} title={status.success ? '连接测试通过' : '连接测试失败'} />
                      )}
                      {/* 状态标签 */}
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${sc.bg} ${sc.text} ${sc.border}`}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 truncate text-xs opacity-70">{provider.baseUrl}</p>
                </button>
              );
            })
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
                <div className={`${labelClass} md:col-span-2`}>
                  Base URL
                  <div className="flex gap-2">
                    <input className={`${inputClass} flex-1`} value={selectedProvider.baseUrl} onChange={(e) => updateProvider({ baseUrl: e.target.value })} />
                  </div>
                  <p className="text-xs text-dark-500 mt-1">请填写API地址，如 https://your-oneapi.com（系统会自动拼接 /v1/ 路径）</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={testConnection}
                      disabled={testing || !selectedProvider.baseUrl || !selectedProvider.apiKey}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 px-3 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-40"
                      title="一键测试连接"
                    >
                      {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                      一键测试
                    </button>
                  </div>
                </div>
                <div className={`${labelClass} md:col-span-2`}>
                  API Key
                  <div className="flex gap-2">
                    <input type="password" className={`${inputClass} flex-1`} value={selectedProvider.apiKey} onChange={(e) => updateProvider({ apiKey: e.target.value })} placeholder="粘贴 API Key，留空保留原密钥" />
                    <button
                      onClick={testConnection}
                      disabled={testing || !selectedProvider.baseUrl || !selectedProvider.apiKey}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 px-3 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-40"
                      title="一键测试连接"
                    >
                      {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                      测试
                    </button>
                  </div>
                </div>
                {/* 连接测试结果 */}
                {connectionStatus[selectedProvider.id] && (
                  <div className={`md:col-span-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                    connectionStatus[selectedProvider.id]?.success
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/20 bg-red-500/10 text-red-300'
                  }`}>
                    {connectionStatus[selectedProvider.id]?.success ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>连接成功！共发现 {connectionStatus[selectedProvider.id]?.modelCount} 个可用模型</span>
                      </>
                    ) : (
                      <>
                        <Wifi size={16} className="text-red-400" />
                        <span>连接失败：{connectionStatus[selectedProvider.id]?.error}</span>
                      </>
                    )}
                  </div>
                )}
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
                  <p className="mt-1 text-xs text-dark-500">把前台模型 ID 映射到上游模型 ID，或点击同步自动获取上游模型库。</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={syncModels}
                    disabled={syncing || !selectedProvider.baseUrl || !selectedProvider.apiKey}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-40"
                    title="从上游 API 自动同步模型列表"
                  >
                    {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    同步模型
                  </button>
                  <button onClick={addModel} className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 px-3 py-2 text-sm text-purple-300 transition hover:bg-purple-500/10">
                    <Plus size={16} />
                    添加映射
                  </button>
                </div>
              </div>

              {/* 同步结果统计 */}
              {syncResult && (
                <div className="mb-4 flex items-center gap-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-sm">
                  <CheckCircle2 size={16} className="text-cyan-400" />
                  <span className="text-cyan-200">
                    共发现 <strong>{syncResult.total}</strong> 个模型，新增 <strong>{syncResult.added}</strong> 个，已存在 <strong>{syncResult.existing}</strong> 个
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {selectedProvider.models.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-dark-500">
                    <Server size={32} className="mb-2 opacity-40" />
                    <p className="text-sm">暂无模型映射</p>
                    <p className="mt-1 text-xs">点击"同步模型"从上游自动获取，或手动"添加映射"</p>
                  </div>
                )}
                {selectedProvider.models.map((model, index) => (
                  <div key={`${model.localModel}-${index}`} className="rounded-2xl border border-purple-500/10 bg-dark-900/40 p-4">
                    {/* 映射关系展示 */}
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-lg bg-purple-500/15 border border-purple-500/20 px-3 py-1 font-mono text-xs text-purple-300">
                        {model.localModel}
                      </span>
                      <ArrowRight size={14} className="text-dark-500" />
                      <span className="rounded-lg bg-cyan-500/15 border border-cyan-500/20 px-3 py-1 font-mono text-xs text-cyan-300">
                        {model.upstreamModel}
                      </span>
                      <ArrowRight size={14} className="text-dark-500" />
                      <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 text-xs text-emerald-400">
                        {CATEGORY_LABELS[model.category] || model.category}
                      </span>
                      <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${model.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-dark-700 text-dark-500'}`}>
                        {model.enabled ? '启用' : '停用'}
                      </span>
                    </div>
                    {/* 可编辑字段 */}
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_130px_80px_40px]">
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
