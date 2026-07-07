import { useEffect, useState } from 'react';
import { Bell, Clock, Gift, Home, Image, RefreshCw, Save, Settings, ShieldAlert, Type } from 'lucide-react';
import api from '@/utils/api';

interface SystemConfig {
  platformName: string;
  logoUrl: string;
  welcomeBonus: number;
  dailyCheckInBonus: number;
  orderExpireMinutes: number;
  modelCallTimeoutSeconds: number;
  maintenanceMode: boolean;
  announcement: string;
  inviteRewardPercent: number;
  heroTitleZh: string;
  heroTitleEn: string;
  heroEnglishTitleZh: string;
  heroEnglishTitleEn: string;
  heroSubtitleZh: string;
  heroSubtitleEn: string;
  heroCtaZh: string;
  heroCtaEn: string;
  footerCopyrightZh: string;
  footerCopyrightEn: string;
}

const defaultSystemConfig: SystemConfig = {
  platformName: '2PIX',
  logoUrl: '',
  welcomeBonus: 0,
  dailyCheckInBonus: 80,
  orderExpireMinutes: 30,
  modelCallTimeoutSeconds: 120,
  maintenanceMode: false,
  announcement: '',
  inviteRewardPercent: 10,
  heroTitleZh: '灵感流动，万物生长',
  heroTitleEn: '灵感流动，万物生长',
  heroEnglishTitleZh: 'Inspiration flows. Everything grows.',
  heroEnglishTitleEn: 'Inspiration flows. Everything grows.',
  heroSubtitleZh: '一个账户，聚合主流 AI 模型。',
  heroSubtitleEn: 'One account, all major AI models.',
  heroCtaZh: '开始创作',
  heroCtaEn: 'Start Creating',
  footerCopyrightZh: '© 2026 AI聚合平台. All rights reserved.',
  footerCopyrightEn: '© 2026 AI Aggregator. All rights reserved.',
};

export default function AdminSystemConfigPage() {
  const [config, setConfig] = useState<SystemConfig>(defaultSystemConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ value: SystemConfig }>('/admin/configs/system');
      setConfig({ ...defaultSystemConfig, ...data.value });
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
      await api.put('/admin/configs/system', { value: config });
      setNotice('系统配置已保存');
      await loadConfig();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const inputClass = 'w-full rounded-xl border border-purple-500/10 bg-dark-900/50 px-3 py-2.5 text-sm text-dark-200 outline-none transition focus:border-purple-500/30';
  const labelClass = 'space-y-2 text-sm text-dark-300';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-purple-400">SYSTEM CENTER</p>
          <h1 className="mt-2 text-2xl font-bold text-dark-100">系统配置</h1>
          <p className="mt-1 text-sm text-dark-400">管理平台基础信息、注册赠送、订单过期和运营公告。</p>
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass rounded-2xl p-5">
          <Settings className="mb-3 text-purple-400" size={22} />
          <p className="text-xl font-bold text-dark-100">{config.platformName}</p>
          <p className="text-xs text-dark-500 mt-1">平台名称</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <Gift className="mb-3 text-emerald-400" size={22} />
          <p className="text-xl font-bold text-dark-100">{config.welcomeBonus.toLocaleString()}</p>
          <p className="text-xs text-dark-500 mt-1">注册赠送积分</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <Clock className="mb-3 text-yellow-400" size={22} />
          <p className="text-xl font-bold text-dark-100">{config.orderExpireMinutes} 分钟</p>
          <p className="text-xs text-dark-500 mt-1">订单过期时间</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <ShieldAlert className={`mb-3 ${config.maintenanceMode ? 'text-red-400' : 'text-cyan-400'}`} size={22} />
          <p className="text-xl font-bold text-dark-100">{config.maintenanceMode ? '维护中' : '正常运行'}</p>
          <p className="text-xs text-dark-500 mt-1">维护模式</p>
        </div>
      </div>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center gap-2">
          <Settings size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-dark-100">基础信息</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>平台名称
            <input className={inputClass} value={config.platformName} onChange={(e) => updateConfig('platformName', e.target.value)} />
          </label>
          <label className={labelClass}>Logo URL
            <input className={inputClass} value={config.logoUrl} onChange={(e) => updateConfig('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" />
          </label>
        </div>
        {config.logoUrl && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-purple-500/10 bg-dark-900/40 p-4">
            <Image size={18} className="text-dark-500" />
            <img src={config.logoUrl} alt="Logo 预览" className="h-10 w-10 rounded-lg object-cover" />
            <span className="text-sm text-dark-400">Logo 预览</span>
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center gap-2">
          <Gift size={20} className="text-emerald-400" />
          <h2 className="text-lg font-semibold text-dark-100">业务参数</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <label className={labelClass}>新用户赠送积分
            <input type="number" min={0} className={inputClass} value={config.welcomeBonus} onChange={(e) => updateConfig('welcomeBonus', Number(e.target.value))} />
          </label>
          <label className={labelClass}>每日签到积分
            <input type="number" min={0} max={10000} className={inputClass} value={config.dailyCheckInBonus} onChange={(e) => updateConfig('dailyCheckInBonus', Number(e.target.value))} />
          </label>
          <label className={labelClass}>邀请返佣比例（%）
            <input type="number" min={0} max={100} className={inputClass} value={config.inviteRewardPercent} onChange={(e) => updateConfig('inviteRewardPercent', Number(e.target.value))} />
          </label>
          <label className={labelClass}>订单过期时间（分钟）
            <input type="number" min={5} max={1440} className={inputClass} value={config.orderExpireMinutes} onChange={(e) => updateConfig('orderExpireMinutes', Number(e.target.value))} />
          </label>
          <label className={labelClass}>模型调用超时（秒）
            <input type="number" min={10} max={3600} className={inputClass} value={config.modelCallTimeoutSeconds} onChange={(e) => updateConfig('modelCallTimeoutSeconds', Number(e.target.value))} />
          </label>
        </div>
        <p className="mt-3 text-xs text-dark-500">订单过期时间会立即影响新创建的充值订单；新用户赠送积分会影响之后注册的新用户；每日签到积分会影响之后的签到奖励。</p>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center gap-2">
          <Home size={20} className="text-cyan-400" />
          <h2 className="text-lg font-semibold text-dark-100">首页自定义</h2>
          <span className="ml-2 text-xs text-dark-500">为空时使用默认值</span>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              <span className="flex items-center gap-1.5"><Type size={14} className="text-cyan-400" /> Hero 中文标题</span>
              <input className={inputClass} value={config.heroTitleZh} onChange={(e) => updateConfig('heroTitleZh', e.target.value)} placeholder="灵感流动，万物生长" />
            </label>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5"><Type size={14} className="text-cyan-400" /> Hero English Title</span>
              <input className={inputClass} value={config.heroTitleEn} onChange={(e) => updateConfig('heroTitleEn', e.target.value)} placeholder="灵感流动，万物生长" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>英文副标题（中文模式）
              <input className={inputClass} value={config.heroEnglishTitleZh} onChange={(e) => updateConfig('heroEnglishTitleZh', e.target.value)} placeholder="Inspiration flows. Everything grows." />
            </label>
            <label className={labelClass}>英文副标题（英文模式）
              <input className={inputClass} value={config.heroEnglishTitleEn} onChange={(e) => updateConfig('heroEnglishTitleEn', e.target.value)} placeholder="Inspiration flows. Everything grows." />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>副标题（中文）
              <input className={inputClass} value={config.heroSubtitleZh} onChange={(e) => updateConfig('heroSubtitleZh', e.target.value)} placeholder="一个账户，聚合主流 AI 模型。" />
            </label>
            <label className={labelClass}>副标题（英文）
              <input className={inputClass} value={config.heroSubtitleEn} onChange={(e) => updateConfig('heroSubtitleEn', e.target.value)} placeholder="One account, all major AI models." />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>CTA 按钮（中文）
              <input className={inputClass} value={config.heroCtaZh} onChange={(e) => updateConfig('heroCtaZh', e.target.value)} placeholder="开始创作" />
            </label>
            <label className={labelClass}>CTA 按钮（英文）
              <input className={inputClass} value={config.heroCtaEn} onChange={(e) => updateConfig('heroCtaEn', e.target.value)} placeholder="Start Creating" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>页脚版权（中文）
              <input className={inputClass} value={config.footerCopyrightZh} onChange={(e) => updateConfig('footerCopyrightZh', e.target.value)} placeholder="© 2026 AI聚合平台. All rights reserved." />
            </label>
            <label className={labelClass}>页脚版权（英文）
              <input className={inputClass} value={config.footerCopyrightEn} onChange={(e) => updateConfig('footerCopyrightEn', e.target.value)} placeholder="© 2026 AI Aggregator. All rights reserved." />
            </label>
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-yellow-400" />
            <h2 className="text-lg font-semibold text-dark-100">公告与维护</h2>
          </div>
          <label className="flex items-center gap-2 text-sm text-dark-300">
            <input type="checkbox" checked={config.maintenanceMode} onChange={(e) => updateConfig('maintenanceMode', e.target.checked)} />
            开启维护模式
          </label>
        </div>
        <label className={labelClass}>全局公告
          <textarea
            rows={5}
            className={inputClass}
            value={config.announcement}
            onChange={(e) => updateConfig('announcement', e.target.value)}
            placeholder="输入展示给用户的公告内容，可用于活动、维护通知或支付提醒。"
          />
        </label>
      </section>
    </div>
  );
}
