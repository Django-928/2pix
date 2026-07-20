import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  User,
  Lightbulb,
  Film,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Globe,
  Moon,
  Sun,
  Zap,
  ImagePlus,
  Mic,
  Camera,
  Smile,
  Pencil,
  Cpu,
  Droplets,
  Clapperboard,
  Aperture,
  Type,
  Gauge,
  HelpCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { aiModels as defaultModels, primaryCategories, secondaryCategories } from '@/data/models';
import type { AIModel } from '@/data/models';
import type { Project } from '@/types';
import { agents as agentList, getAgentById } from '@/data/agents';
import type { Agent } from '@/data/agents';
import { AgentChatView } from '@/pages/AgentRunPage';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import useAuthStore from '@/store/useAuthStore';
import useAccountStore from '@/store/useAccountStore';
import api from '@/utils/api';
import { useToast } from '@/components/ui/Toast';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import ChatWorkbench from '@/components/workbench/ChatWorkbench';
import ImageWorkbench from '@/components/workbench/ImageWorkbench';
import VideoWorkbench from '@/components/workbench/VideoWorkbench';

/* ─────────────── 主页面 ─────────────── */
/* ───── API 返回的 snake_case 模型数据 ───── */
interface ApiModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: string;
  sort_order: number;
  is_new: boolean;
  is_hot: boolean;
}

/** 将 API snake_case 数据映射为前端 AIModel 格式 */
function mapApiModel(api: ApiModel): AIModel {
  const tags: string[] = [];
  if (api.is_hot) tags.push('热门');
  if (api.is_new) tags.push('新品');
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    icon: api.icon,
    category: api.category as AIModel['category'],
    tags,
    isNew: api.is_new || undefined,
    isHot: api.is_hot || undefined,
  };
}

/** 根据 primary / secondary / search 过滤模型列表 */
const filterModels = (models: AIModel[], primary: string, secondary: string, search: string): AIModel[] => {
  let filtered = models;
  if (primary !== 'damoxing') return [];
  if (secondary !== 'all' && secondary !== 'mine') {
    filtered = filtered.filter((m) => m.category === secondary);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  const pinned = filtered.filter((m) => m.isPinned);
  const rest = filtered.filter((m) => !m.isPinned);
  return [...pinned, ...rest];
};

interface ParamOptionItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface ParamConfigItem {
  id: string;
  label: string;
  title: string;
  options: ParamOptionItem[];
}

const paramConfig: ParamConfigItem[] = [
  {
    id: 'style',
    label: '风格',
    title: '选择画面风格',
    options: [
      { id: 'realistic', label: '写实', icon: Camera },
      { id: 'anime', label: '动漫', icon: Smile },
      { id: 'sketch', label: '素描', icon: Pencil },
      { id: 'cyber', label: '赛博', icon: Cpu },
      { id: 'ink', label: '水墨', icon: Droplets },
      { id: 'cinematic', label: '电影', icon: Clapperboard },
    ],
  },
  {
    id: 'ratio',
    label: '比例',
    title: '选择画面比例',
    options: [
      { id: '1:1', label: '1:1' },
      { id: '4:3', label: '4:3' },
      { id: '16:9', label: '16:9' },
      { id: '9:16', label: '9:16' },
      { id: '3:4', label: '3:4' },
      { id: '21:9', label: '21:9' },
    ],
  },
  {
    id: 'count',
    label: '数量',
    title: '选择生成数量',
    options: [
      { id: '1', label: '1 张' },
      { id: '2', label: '2 张' },
      { id: '4', label: '4 张' },
      { id: '8', label: '8 张' },
    ],
  },
  {
    id: 'advanced',
    label: '高级',
    title: '高级参数',
    options: [
      { id: 'hd', label: '高清', icon: Aperture },
      { id: 'raw', label: '原生', icon: Type },
      { id: 'fast', label: '快速', icon: Gauge },
      { id: 'quality', label: '高质量', icon: Sparkles },
    ],
  },
];

const primaryIcons: Record<string, LucideIcon> = {
  damoxing: Sparkles,
  zhinengti: User,
  linggan: Lightbulb,
};

const navItems = [
  { id: 'workbench', label: '工作台', to: '/home' },
  { id: 'manju', label: '漫剧', to: '/manju' },
  { id: 'agent', label: '智能体', to: '/agents' },
  { id: 'profile', label: '个人中心', to: '/profile' },
];

function getModelGradient(category: AIModel['category']) {
  switch (category) {
    case 'chat':
      return 'from-slate-500 to-slate-700';
    case 'image':
      return 'from-emerald-400 to-cyan-400';
    case 'video':
      return 'from-blue-500 to-indigo-600';
    case 'audio':
      return 'from-violet-500 to-fuchsia-500';
    default:
      return 'from-slate-500 to-slate-700';
  }
}

export default function UnifiedWorkbenchPage() {
  const [activeModelId, setActiveModelId] = useState('gpt-5.5');
  const [primaryTab, setPrimaryTab] = useState('damoxing');
  const [secondaryTab, setSecondaryTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>(defaultModels);
  const [activeParamId, setActiveParamId] = useState<string | null>(null);
  const [paramSelections, setParamSelections] = useState<Record<string, string>>({});
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'model' | 'manju' | 'agent'>('model');
  const [previewTask, setPreviewTask] = useState<Project | null>(null);

  /* ───── 挂载时从 API 拉取模型列表，失败时静默回退 ───── */
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<ApiModel[]>('/models');
        if (Array.isArray(data) && data.length > 0) {
          const pinnedDefaults = defaultModels.filter((m) => m.isPinned);
          const apiIds = new Set(data.map((m) => m.id));
          const uniquePinned = pinnedDefaults.filter((m) => !apiIds.has(m.id));
          setModels([...uniquePinned, ...data.map(mapApiModel)]);
        }
      } catch {
        // 静默回退：API 不可用时继续使用 defaultModels
      }
    })();
  }, []);

  const activeModel = models.find((m) => m.id === activeModelId) || models[0];

  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const toggleLanguageFn = useSettingsStore((s) => s.toggleLanguage);
  const authUser = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const balance = useAccountStore((s) => s.balance);
  const refreshBalance = useAccountStore((s) => s.refreshBalance);
  const projects = useStore((s) => s.projects);
  const conversations = useStore((s) => s.conversations);
  const toast = useToast();
  const displayName = authUser?.nickname || authUser?.username || '用户';
  const avatarText = displayName.slice(0, 1).toUpperCase();
  const displayBalance = authUser?.balance ?? balance;

  useEffect(() => {
    refreshMe();
    refreshBalance().catch(() => undefined);
  }, [refreshMe, refreshBalance]);

  const filteredModels = useMemo(() => {
    return filterModels(models, primaryTab, secondaryTab, searchQuery);
  }, [models, primaryTab, secondaryTab, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (activeModel.category === 'chat') return [];
    const keyword = taskSearch.trim().toLowerCase();
    return projects.filter((p) => {
      const matchType = p.type === activeModel.category;
      const matchText = !keyword || p.name.toLowerCase().includes(keyword);
      return matchType && matchText;
    });
  }, [projects, activeModel.category, taskSearch]);

  const activeParam = useMemo(
    () => paramConfig.find((p) => p.id === activeParamId) || null,
    [activeParamId]
  );

  const handleModelSelect = (model: AIModel) => {
    setActiveModelId(model.id);
    setSecondaryTab(model.category);
  };

  const handleCategoryChange = (catId: string) => {
    setSecondaryTab(catId);
    const firstModel = filterModels(models, primaryTab, catId, searchQuery);
    if (firstModel.length > 0 && !firstModel.some((m) => m.id === activeModelId)) {
      setActiveModelId(firstModel[0].id);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    const category = activeModel.category;
    const style = paramSelections['style'] || 'auto';
    const ratio = paramSelections['ratio'] || '1:1';
    const quality = paramSelections['quality'] || 'standard';

    try {
      await runBillableTask({
        model: activeModel.id,
        category,
        estimatedCost: await getEstimatedCost(category),
        description: `工作台 ${activeModel.name} 生成`,
        onBalanceChange: refreshBalance,
        run: async () => {
          let result: Record<string, unknown>;

          if (category === 'chat') {
            result = await api.post('/chat/message', {
              prompt,
              model: activeModel.id,
              params: { messages: [{ role: 'user', content: prompt }] },
            });
            toast.success(`${activeModel.name} 回复已生成`);
          } else if (category === 'image') {
            const count = parseInt(paramSelections['count'] || '1');
            const advanced = paramSelections['advanced'] || null;
            const advancedResolutionMap: Record<string, string> = {
              hd: '1024x1024',
              fast: '480x480',
              raw: ratio === '1:1' ? '1024x1024' : ratio === '16:9' ? '1792x1024' : '1024x1792',
              quality: ratio === '1:1' ? '1024x1024' : ratio === '16:9' ? '1792x1024' : '1024x1792',
            };
            const effectiveResolution = advanced && advancedResolutionMap[advanced]
              ? advancedResolutionMap[advanced]
              : ratio === '1:1' ? '1024x1024' : ratio === '16:9' ? '1792x1024' : '1024x1792';
            result = await api.post('/image/generate', {
              prompt,
              model: activeModel.id,
              style,
              resolution: effectiveResolution,
              count,
              ...(advanced ? { advanced } : {}),
            });
            toast.success(`${activeModel.name} 图片已生成`);
          } else if (category === 'video') {
            const advanced = paramSelections['advanced'] || null;
            const advancedVideoResolutionMap: Record<string, string> = {
              hd: '1080p',
              fast: '480p',
              raw: '720p',
              quality: '1080p',
            };
            const effectiveResolution = advanced && advancedVideoResolutionMap[advanced]
              ? advancedVideoResolutionMap[advanced]
              : '720p';
            result = await api.post('/video/generate', {
              prompt,
              model: activeModel.id,
              aspectRatio: ratio,
              duration: quality === 'quality' ? '10' : '5',
              resolution: effectiveResolution,
            });
            toast.success(`${activeModel.name} 视频已提交生成`);
          } else {
            result = await api.post('/audio/generate', {
              prompt,
              model: activeModel.id,
            });
            toast.success(`${activeModel.name} 音频已提交生成`);
          }

          return result;
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '生成失败，请重试';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
      // 防止连续点击
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = setTimeout(() => setIsGenerating(false), 1000);
    }
  };

  const modelGradient = getModelGradient(activeModel.category);

  return (
    <div className="h-screen text-white flex overflow-hidden relative">
      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.98); }
        }
      `}</style>

      {/* ───── 背景层 ───── */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 20% 30%, rgba(0,210,255,0.12) 0%, transparent 45%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.10) 0%, transparent 40%), radial-gradient(ellipse at 60% 80%, rgba(0,210,255,0.08) 0%, transparent 45%), radial-gradient(ellipse at 15% 75%, rgba(139,92,246,0.07) 0%, transparent 35%)',
          }}
        />
        <div
          className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] rounded-full blur-[80px] opacity-45 bg-[radial-gradient(circle,rgba(0,210,255,0.35),transparent_70%)]"
          style={{ animation: 'drift 20s ease-in-out infinite' }}
        />
        <div
          className="absolute top-[10%] -right-[5%] w-[400px] h-[400px] rounded-full blur-[80px] opacity-45 bg-[radial-gradient(circle,rgba(139,92,246,0.35),transparent_70%)]"
          style={{ animation: 'drift 20s ease-in-out infinite -7s' }}
        />
        <div
          className="absolute bottom-[10%] left-[25%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-45 bg-[radial-gradient(circle,rgba(0,210,255,0.25),transparent_70%)]"
          style={{ animation: 'drift 20s ease-in-out infinite -14s' }}
        />
        <div
          className="absolute -bottom-[5%] right-[20%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-45 bg-[radial-gradient(circle,rgba(139,92,246,0.22),transparent_70%)]"
          style={{ animation: 'drift 20s ease-in-out infinite -10s' }}
        />
      </div>

      <div
        className="fixed inset-0 z-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className="fixed inset-0 z-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundSize: '60px 60px',
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />

      {/* ───── 顶部 Header ───── */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 px-6 grid grid-cols-[auto_1fr_auto] items-center bg-white/[0.025] backdrop-blur-xl border-b border-white/[0.06]">
        <Link to="/home" className="flex items-center gap-3 justify-self-start">
          <svg className="w-8 h-8 text-white" viewBox="0 0 256 256" fill="currentColor">
            <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
          </svg>
          <span className="text-lg font-semibold tracking-tight text-white">2Pix AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 justify-self-center bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-full px-1 py-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                item.id === 'workbench'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 justify-self-end">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04]">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">
              {Number(displayBalance || 0).toLocaleString()}
            </span>
            <Link
              to="/profile"
              className="ml-1 text-xs px-2.5 py-0.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              充值
            </Link>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/70 hover:bg-white/10 transition"
            title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              toggleLanguageFn();
              toast.success(language === 'zh' ? 'Switched to English' : '已切换为中文');
            }}
            className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/70 hover:bg-white/10 transition"
            title={language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            <Globe className="w-4 h-4" />
          </button>

          <Link
            to="/profile"
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition"
          >
            {authUser?.avatar ? (
              <img
                src={authUser.avatar}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                {avatarText}
              </div>
            )}
            <span className="text-sm hidden xl:block text-white/90">{displayName}</span>
          </Link>
        </div>
      </header>

      {/* ───── 主体布局 ───── */}
      <div className="relative z-10 pt-16 h-screen w-full flex overflow-hidden">
        {/* ───── 左侧模型库 ───── */}
        <aside className="w-[280px] flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-white/[0.025] backdrop-blur-xl">
          <div className="p-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-cyan-400/70 transition" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模型、能力、场景..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/40 focus:border-cyan-400/40 focus:bg-white/[0.06] focus:outline-none transition"
              />
            </div>
          </div>

          <div className="px-3 pb-3 flex gap-1 border-b border-white/[0.06]">
            {primaryCategories.map((cat) => {
              const Icon = primaryIcons[cat.id];
              return (
                <button
                  key={cat.id}
                  onClick={() => setPrimaryTab(cat.id)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    primaryTab === cat.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-3 flex gap-2 overflow-x-auto">
            {secondaryCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                  secondaryTab === cat.id
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {filteredModels.length === 0 && primaryTab !== 'zhinengti' ? (
              <div className="text-center py-8 text-xs text-white/30">未找到模型</div>
            ) : (
              <>
                {filteredModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className={`w-full px-3 py-3 rounded-xl text-left transition-all border-l-2 ${
                      activeModelId === model.id
                        ? 'bg-gradient-to-r from-cyan-500/10 to-cyan-500/[0.03] border-cyan-400 shadow-[inset_0_0_20px_rgba(0,210,255,0.05)]'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getModelGradient(
                          model.category
                        )} flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden`}
                        style={model.icon.startsWith('http') ? { padding: 0, background: 'transparent' } : {}}
                      >
                        {model.icon.startsWith('http') ? (<img src={model.icon} alt={model.name} className="w-10 h-10 rounded-xl object-cover" />) : (model.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium truncate ${
                              activeModelId === model.id ? 'text-white' : 'text-white/90'
                            }`}
                          >
                            {model.name}
                          </span>
                          {model.isHot && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20">
                              热门
                            </span>
                          )}
                          {model.isNew && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/10 text-white/70">
                              新品
                            </span>
                          )}
                          {model.isFree && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-green-500/15 text-green-300 border border-green-500/20">
                              免费
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            activeModelId === model.id ? 'text-white/70' : 'text-white/40'
                          }`}
                        >
                          {model.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {primaryTab === 'zhinengti' && (
                  <>
                    {/* 漫剧工坊入口 */}
                    <button
                      type="button"
                      onClick={() => { setActiveAgentId(null); setActivePanel('manju'); }}
                      className={`block w-full px-3 py-3 rounded-xl text-left transition-all border ${
                        activePanel === 'manju' ? 'border-fuchsia-500/40 bg-fuchsia-500/10' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold shadow-lg">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">漫剧工坊</span>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/10 text-white/70">
                              入口
                            </span>
                          </div>
                          <p className="text-xs text-white/40 truncate mt-0.5">
                            剧本、角色、分镜、批量生成一体化创作
                          </p>
                        </div>
                      </div>
                    </button>
                    {/* 工作流Agent列表 */}
                    {(() => {
                      const filtered = secondaryTab === 'all'
                        ? agentList
                        : agentList.filter((a: Agent) => a.category === secondaryTab);
                      return filtered.map((agent: Agent) => {
                        const gradientMap: Record<string, string> = {
                          chat: 'from-blue-500 to-indigo-500',
                          image: 'from-emerald-400 to-cyan-400',
                          video: 'from-orange-500 to-red-500',
                        };
                        const isActive = activeAgentId === agent.id && activePanel === 'agent';
                        return (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => { setActiveAgentId(agent.id); setActivePanel('agent'); }}
                            className={`block w-full px-3 py-3 rounded-xl text-left transition-all border ${
                              isActive ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientMap[agent.category] || 'from-purple-500 to-indigo-500'} flex items-center justify-center text-lg shadow-lg`}>
                                {agent.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-500/20 text-purple-300">
                                    工作流
                                  </span>
                                </div>
                                <p className="text-xs text-white/40 truncate mt-0.5">
                                  {agent.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ───── 中间工作区 ───── */}
        {activePanel === 'agent' && activeAgentId ? (
          (() => {
            const agent = getAgentById(activeAgentId);
            if (!agent) return null;
            const gradientMap: Record<string, string> = {
              chat: 'from-blue-500 to-indigo-500',
              image: 'from-emerald-400 to-cyan-400',
              video: 'from-orange-500 to-red-500',
            };
            const gradient = gradientMap[agent.category] || 'from-purple-500 to-indigo-500';
            return (
              <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
                {/* 顶栏 */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
                  <button
                    onClick={() => { setActiveAgentId(null); setActivePanel('model'); }}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-lg`}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-white">{agent.name}</h2>
                    <p className="text-xs text-white/40 truncate">{agent.description}</p>
                  </div>
                  <span className="px-2 py-1 rounded-md text-[10px] bg-purple-500/20 text-purple-300 font-medium">
                    {agent.category === 'chat' ? '对话' : agent.category === 'image' ? '图片' : '视频'}
                  </span>
                </div>
                {/* 执行区 */}
                <div className="flex-1 min-h-0">
                  {agent.category === 'chat' ? (
                    <AgentChatView agent={agent} />
                  ) : agent.category === 'image' ? (
                    <ImageWorkbench model={{ id: agent.model, name: agent.name, description: agent.description, icon: agent.icon, category: 'image', tags: [] }} />
                  ) : (
                    <VideoWorkbench model={{ id: agent.model, name: agent.name, description: agent.description, icon: agent.icon, category: 'video', tags: [] }} />
                  )}
                </div>
              </main>
            );
          })()
        ) : activePanel === 'manju' ? (
          <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
              <button
                onClick={() => { setActivePanel('model'); }}
                className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold shadow-lg">
                <Film className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-white">漫剧工坊</h2>
                <p className="text-xs text-white/40 truncate">剧本、角色、分镜、批量生成一体化创作</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Link to="/manju" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm shadow-lg hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
                进入漫剧工坊
              </Link>
            </div>
          </main>
        ) : (
        <main className="flex-1 min-w-0 flex flex-col relative">
          {/* 上 2/3 结果/画布区 */}
          <div
            className={`min-h-0 flex flex-col items-center relative overflow-hidden ${
              activeModel.category === 'chat' ? 'flex-1' : 'flex-[2] justify-center p-8'
            }`}
            style={{
              background: 'radial-gradient(circle at center, rgba(0,210,255,0.03) 0%, transparent 60%)',
            }}
          >
            {activeModel.category === 'chat' ? (
              <div className="w-full h-full overflow-hidden">
                <ChatWorkbench model={activeModel} />
              </div>
            ) : activeModel.category === 'image' ? (
              <div className="w-full h-full overflow-hidden">
                <ImageWorkbench model={activeModel} />
              </div>
            ) : (
              <div className="text-center space-y-5 max-w-md">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${modelGradient} flex items-center justify-center mx-auto shadow-lg overflow-hidden`}
                  style={activeModel.icon.startsWith('http') ? { padding: 0, background: 'transparent' } : {}}
                >
                  {activeModel.icon.startsWith('http') ? (<img src={activeModel.icon} alt={activeModel.name} className="w-16 h-16 rounded-2xl object-cover" />) : (<span className="text-2xl font-bold text-white">{activeModel.icon}</span>)}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-1">{activeModel.name}</h1>
                  <p className="text-sm text-white/50">{activeModel.description}</p>
                </div>
                <p className="text-sm text-white/40">在下方输入描述，点击开始生成</p>
              </div>
            )}
          </div>

          {/* 下 1/3 输入区（聊天和图片模式不需要，输入框已内置在 Workbench 中） */}
          {activeModel.category !== 'chat' && activeModel.category !== 'image' && (
            <div
              className="flex-1 min-h-0 flex flex-col justify-end p-6 pb-8 z-10"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.85) 15%, rgba(10,10,10,0.95) 100%)',
              }}
            >
              <div className="max-w-4xl mx-auto w-full space-y-4">
                {/* 输入框 */}
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.2)] focus-within:border-cyan-400/30 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_32px_rgba(0,210,255,0.1)] p-1 transition-all">
                  <div className="bg-black/25 rounded-xl p-5">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="描述你想要的画面，例如：一件白色亚麻衬衫挂在木质衣架上，自然光，简约背景，电商主图风格..."
                      className="w-full bg-transparent text-white placeholder-white/35 resize-none focus:outline-none text-[15px] leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="上传参考图"
                          className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-cyan-400 transition"
                        >
                          <ImagePlus className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          title="语音输入"
                          className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-cyan-400 transition"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          title="灵感"
                          className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-cyan-400 transition"
                        >
                          <Lightbulb className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="text-xs text-white/40 font-medium">{prompt.length} / 2000</div>
                    </div>
                  </div>
                </div>

                {/* 参数 pills + 生成按钮 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {paramConfig.map((param) => (
                      <button
                        key={param.id}
                        type="button"
                        onClick={() =>
                          setActiveParamId(activeParamId === param.id ? null : param.id)
                        }
                        className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          activeParamId === param.id
                            ? 'bg-cyan-400/12 border-cyan-400/40 text-cyan-400 shadow-[0_0_16px_rgba(0,210,255,0.1)]'
                            : 'border-white/[0.08] text-white/70 hover:border-white/[0.15]'
                        }`}
                      >
                        {param.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="group inline-flex items-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-6 py-2.5 shadow-[0_4px_24px_rgba(255,255,255,0.15)] hover:bg-white/90 hover:shadow-[0_6px_32px_rgba(255,255,255,0.22)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>生成中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>开始生成</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* 参数抽屉 */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    activeParamId ? 'max-h-[260px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl p-4">
                    {activeParam && (
                      <>
                        <p className="text-xs text-white/70 mb-3 font-medium">{activeParam.title}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {activeParam.options.map((opt) => {
                            const Icon = opt.icon;
                            const selected = paramSelections[activeParam.id] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setParamSelections((prev) => ({
                                    ...prev,
                                    [activeParam.id]: opt.id,
                                  }))
                                }
                                className={`p-3 rounded-xl text-center transition-all ${
                                  selected
                                    ? 'bg-gradient-to-br from-cyan-400/12 to-cyan-400/4 border border-cyan-400/40 shadow-[0_0_24px_rgba(0,210,255,0.12)]'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5'
                                }`}
                              >
                                {Icon && (
                                  <Icon
                                    className={`w-6 h-6 mx-auto mb-2 ${
                                      selected ? 'text-cyan-400' : 'text-white/50'
                                    }`}
                                  />
                                )}
                                <div
                                  className={`text-xs ${
                                    selected ? 'text-white font-medium' : 'text-white/70'
                                  }`}
                                >
                                  {opt.label}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 底部积分提示 */}
                <div className="flex items-center justify-between text-xs text-white/40 px-1">
                  <div>
                    预计消耗 <span className="text-white font-medium">2 积分</span> · 剩余{' '}
                    <span className="text-white font-medium">
                      {Number(displayBalance || 0).toLocaleString()} 积分
                    </span>
                  </div>
                  <div className="hidden lg:flex items-center gap-1.5 text-white/30">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>提示：加入「光线、材质、视角、背景」等关键词，生成效果更稳定</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        )}

        {/* ───── 右侧可折叠任务列表 ───── */}
        <aside
          className={`relative flex-shrink-0 border-l border-white/[0.06] bg-white/[0.025] backdrop-blur-xl transition-all duration-300 overflow-hidden ${
            taskPanelOpen ? 'w-[300px]' : 'w-12'
          }`}
        >
          <button
            type="button"
            onClick={() => setTaskPanelOpen((open) => !open)}
            title={taskPanelOpen ? '收起任务列表' : '展开任务列表'}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-l-lg bg-white/[0.06] border border-white/[0.08] border-r-0 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition z-10"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-300 ${
                taskPanelOpen ? '' : 'rotate-180'
              }`}
            />
          </button>

          {taskPanelOpen && (
            <>
              <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4">
                <h2 className="text-sm font-semibold text-white">任务列表</h2>
                <button
                  type="button"
                  className="text-xs text-white/40 hover:text-white transition"
                >
                  全部清空
                </button>
              </div>

              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="搜索任务..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/40 text-xs focus:outline-none focus:border-white/20 transition"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {(activePanel === 'agent' && activeAgentId) || activeModel.category === 'chat' ? (
                  // 聊天/Agent模式：显示对话历史
                  (() => {
                    const modelFilter = activePanel === 'agent' && activeAgentId
                      ? `agent:${activeAgentId}`
                      : activeModel.id;
                    const filtered = conversations
                      .filter((c) => c.model === modelFilter)
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10">
                          <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
                          <p className="text-white/40 text-xs">暂无对话记录</p>
                          <p className="text-white/25 text-xs mt-1">开始对话后记录会出现在这里</p>
                        </div>
                      );
                    }
                    return filtered.map((conv) => {
                      const lastMsg = conv.messages[conv.messages.length - 1];
                      return (
                        <div
                          key={conv.id}
                          className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10] transition cursor-default"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">
                                {conv.title}
                              </p>
                              {lastMsg && (
                                <p className="text-[10px] text-white/40 mt-1 line-clamp-2">
                                  {lastMsg.role === 'user' ? '你：' : 'AI：'}{lastMsg.content.slice(0, 60)}
                                </p>
                              )}
                              <p className="text-[10px] text-white/25 mt-1">
                                {new Date(conv.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border bg-blue-500/10 text-blue-300 border-blue-500/20 flex-shrink-0">
                              {conv.messages.length} 条消息
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-xs">暂无任务</p>
                    <p className="text-white/25 text-xs mt-1">生成内容后会出现在这里</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10] transition cursor-pointer"
                      onClick={() => setPreviewTask(task)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {task.outputUrl && (
                            <img
                              src={task.outputUrl}
                              alt={task.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/[0.08]"
                            />
                          )}
                          {!task.outputUrl && (
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getModelGradient(
                              activeModel.category
                            )} flex items-center justify-center text-[10px] font-bold shadow-md flex-shrink-0 overflow-hidden`}
                            style={activeModel.icon.startsWith('http') ? { padding: 0, background: 'transparent' } : {}}
                          >
                            {activeModel.icon.startsWith('http') ? (<img src={activeModel.icon} alt={activeModel.name} className="w-8 h-8 rounded-lg object-cover" />) : (activeModel.icon)}
                          </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate max-w-[110px]">
                              {task.name}
                            </p>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              {new Date(task.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                            task.status === 'complete'
                              ? 'bg-green-500/15 text-green-300 border-green-500/20'
                              : task.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                              : 'bg-white/[0.08] text-white/50 border-white/10'
                          }`}
                        >
                          {task.status === 'complete'
                            ? '已完成'
                            : task.status === 'pending'
                            ? '生成中'
                            : '失败'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>设置</span>
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ───── 任务预览 Modal ───── */}
      {previewTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewTask(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full mx-4 bg-[#1a1a1e] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button onClick={() => setPreviewTask(null)} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition">
              <X className="w-5 h-5" />
            </button>

            {/* 内容区 */}
            <div className="p-6 overflow-y-auto max-h-[85vh]">
              {previewTask.outputUrl && previewTask.type === 'image' && (
                <img src={previewTask.outputUrl} alt={previewTask.name} className="w-full rounded-xl" />
              )}
              {previewTask.outputUrl && previewTask.type === 'video' && (
                <video src={previewTask.outputUrl} controls className="w-full rounded-xl" />
              )}
              {!previewTask.outputUrl && (
                <div className="text-center py-12 text-white/40">暂无生成结果</div>
              )}
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-white">{previewTask.name}</h3>
                <div className="flex gap-2 text-[10px] text-white/40">
                  <span className="px-2 py-0.5 rounded bg-white/[0.06]">{previewTask.type}</span>
                  {previewTask.model && <span className="px-2 py-0.5 rounded bg-white/[0.06]">{previewTask.model}</span>}
                  {previewTask.provider && <span className="px-2 py-0.5 rounded bg-white/[0.06]">{previewTask.provider}</span>}
                </div>
                <p className="text-xs text-white/30">{new Date(previewTask.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
