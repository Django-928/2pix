import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import api from '@/utils/api';

interface PaymentConfig {
  mode: 'mock' | 'production';
  alipay: {
    enabled: boolean;
    appId: string;
    gateway: string;
    notifyUrl: string;
    returnUrl: string;
    publicKey: string;
    privateKey: string;
  };
  wechat: {
    enabled: boolean;
    appId: string;
    mchId: string;
    apiV3Key: string;
    certSerialNo: string;
    notifyUrl: string;
    privateKey: string;
  };
}

const defaultPaymentConfig: PaymentConfig = {
  mode: 'mock',
  alipay: {
    enabled: false,
    appId: '',
    gateway: 'https://openapi.alipay.com/gateway.do',
    notifyUrl: '',
    returnUrl: '',
    publicKey: '',
    privateKey: '',
  },
  wechat: {
    enabled: false,
    appId: '',
    mchId: '',
    apiV3Key: '',
    certSerialNo: '',
    notifyUrl: '',
    privateKey: '',
  },
};

export default function AdminPaymentConfigPage() {
  const [config, setConfig] = useState<PaymentConfig>(defaultPaymentConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ value: PaymentConfig }>('/admin/configs/payment');
      setConfig(data.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig().catch((error) => setNotice(error instanceof Error ? error.message : '加载配置失败'));
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setNotice('');
    try {
      await api.put('/admin/configs/payment', { value: config });
      setNotice('支付配置已保存');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateAlipay = <K extends keyof PaymentConfig['alipay']>(key: K, value: PaymentConfig['alipay'][K]) => {
    setConfig((prev) => ({ ...prev, alipay: { ...prev.alipay, [key]: value } }));
  };

  const updateWechat = <K extends keyof PaymentConfig['wechat']>(key: K, value: PaymentConfig['wechat'][K]) => {
    setConfig((prev) => ({ ...prev, wechat: { ...prev.wechat, [key]: value } }));
  };

  const inputClass = 'w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none transition focus:border-purple-500/30';
  const labelClass = 'space-y-2 text-sm text-dark-300';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-purple-400">PAYMENT CENTER</p>
          <h1 className="mt-2 text-2xl font-bold text-dark-100">支付配置</h1>
          <p className="mt-1 text-sm text-dark-400">预留支付宝和微信支付参数，当前充值链路使用模拟支付到账。</p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          保存配置
        </button>
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.includes('保存') ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
          {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-dark-100">{config.mode === 'mock' ? '模拟支付' : '真实支付'}</p>
              <p className="text-xs text-dark-500">当前支付模式</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-dark-100">{config.alipay.enabled ? '已启用' : '未启用'}</p>
          <p className="text-xs text-dark-500">支付宝</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-dark-100">{config.wechat.enabled ? '已启用' : '未启用'}</p>
          <p className="text-xs text-dark-500">微信支付</p>
        </div>
      </div>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">全局支付模式</h2>
            <p className="text-xs text-dark-500 mt-1">正式接入前建议保持模拟支付，避免误触发真实扣款。</p>
          </div>
          <select
            value={config.mode}
            onChange={(event) => setConfig((prev) => ({ ...prev, mode: event.target.value as PaymentConfig['mode'] }))}
            className="rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none"
          >
            <option value="mock">模拟支付</option>
            <option value="production">真实支付</option>
          </select>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm text-amber-200">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          上线前需要把密钥加密存储，并完成支付宝/微信回调签名验证。
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-100">支付宝配置</h2>
          <label className="flex items-center gap-2 text-sm text-dark-300">
            <input type="checkbox" checked={config.alipay.enabled} onChange={(e) => updateAlipay('enabled', e.target.checked)} />
            启用支付宝
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>App ID<input className={inputClass} value={config.alipay.appId} onChange={(e) => updateAlipay('appId', e.target.value)} /></label>
          <label className={labelClass}>网关地址<input className={inputClass} value={config.alipay.gateway} onChange={(e) => updateAlipay('gateway', e.target.value)} /></label>
          <label className={labelClass}>异步回调地址<input className={inputClass} value={config.alipay.notifyUrl} onChange={(e) => updateAlipay('notifyUrl', e.target.value)} /></label>
          <label className={labelClass}>同步返回地址<input className={inputClass} value={config.alipay.returnUrl} onChange={(e) => updateAlipay('returnUrl', e.target.value)} /></label>
          <label className={`${labelClass} md:col-span-2`}>支付宝公钥
            <textarea rows={3} className={inputClass} value={config.alipay.publicKey} onChange={(e) => updateAlipay('publicKey', e.target.value)} placeholder="粘贴公钥内容，留空保留原密钥" />
          </label>
          <label className={`${labelClass} md:col-span-2`}>应用私钥
            <textarea rows={4} className={inputClass} value={config.alipay.privateKey} onChange={(e) => updateAlipay('privateKey', e.target.value)} placeholder="粘贴私钥内容，留空保留原密钥" />
          </label>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-100">微信支付配置</h2>
          <label className="flex items-center gap-2 text-sm text-dark-300">
            <input type="checkbox" checked={config.wechat.enabled} onChange={(e) => updateWechat('enabled', e.target.checked)} />
            启用微信支付
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>App ID<input className={inputClass} value={config.wechat.appId} onChange={(e) => updateWechat('appId', e.target.value)} /></label>
          <label className={labelClass}>商户号 Mch ID<input className={inputClass} value={config.wechat.mchId} onChange={(e) => updateWechat('mchId', e.target.value)} /></label>
          <label className={labelClass}>API v3 Key
            <input type="password" className={inputClass} value={config.wechat.apiV3Key} onChange={(e) => updateWechat('apiV3Key', e.target.value)} placeholder="留空保留原密钥" />
          </label>
          <label className={labelClass}>证书序列号<input className={inputClass} value={config.wechat.certSerialNo} onChange={(e) => updateWechat('certSerialNo', e.target.value)} /></label>
          <label className={`${labelClass} md:col-span-2`}>异步回调地址<input className={inputClass} value={config.wechat.notifyUrl} onChange={(e) => updateWechat('notifyUrl', e.target.value)} /></label>
          <label className={`${labelClass} md:col-span-2`}>商户私钥
            <textarea rows={4} className={inputClass} value={config.wechat.privateKey} onChange={(e) => updateWechat('privateKey', e.target.value)} placeholder="粘贴私钥内容，留空保留原密钥" />
          </label>
        </div>
      </section>
    </div>
  );
}
