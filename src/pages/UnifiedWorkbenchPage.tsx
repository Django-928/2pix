import { useState, useMemo, useEffect, useRef } from 'react';
import { aiModels as defaultModels } from '@/data/models';
import type { AIModel } from '@/data/models';
import type { Project } from '@/types';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import useAuthStore from '@/store/useAuthStore';
import useAccountStore from '@/store/useAccountStore';
import api from '@/utils/api';
import { useToast } from '@/components/ui/Toast';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { WorkbenchHeader } from '@/components/unified-workbench/WorkbenchHeader';
import { ModelSidebar } from '@/components/unified-workbench/ModelSidebar';
import { WorkbenchMain } from '@/components/unified-workbench/WorkbenchMain';
import { TaskSidebar } from '@/components/unified-workbench/TaskSidebar';

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
        // 仅当 API 返回的模型使用图片图标（http）时才覆盖前端默认模型
        // 旧数据库模型的 icon 是 emoji，应忽略以使用前端 87 个 KIE 模型
        if (Array.isArray(data) && data.length > 0 && data.some((m) => m.icon?.startsWith('http'))) {
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
  const toast = useToast();
  const displayName = authUser?.nickname || authUser?.username || '用户';
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

  const modelGradient = getModelGradient(activeModel.category);

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
            const effectiveResolution =
              advanced && advancedResolutionMap[advanced]
                ? advancedResolutionMap[advanced]
                : ratio === '1:1'
                ? '1024x1024'
                : ratio === '16:9'
                ? '1792x1024'
                : '1024x1792';
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
            const effectiveResolution =
              advanced && advancedVideoResolutionMap[advanced]
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

      <WorkbenchHeader
        theme={theme}
        language={language}
        displayBalance={displayBalance}
        displayName={displayName}
        avatarUrl={authUser?.avatar}
        onToggleTheme={toggleTheme}
        onToggleLanguage={toggleLanguageFn}
      />

      {/* ───── 主体布局 ───── */}
      <div className="relative z-10 pt-16 h-screen w-full flex overflow-hidden">
        <ModelSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          primaryTab={primaryTab}
          onPrimaryTabChange={setPrimaryTab}
          secondaryTab={secondaryTab}
          onSecondaryTabChange={handleCategoryChange}
          filteredModels={filteredModels}
          activeModelId={activeModelId}
          onModelSelect={handleModelSelect}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          activeAgentId={activeAgentId}
          setActiveAgentId={setActiveAgentId}
        />

        <WorkbenchMain
          activePanel={activePanel}
          activeAgentId={activeAgentId}
          setActiveAgentId={setActiveAgentId}
          setActivePanel={setActivePanel}
          activeModel={activeModel}
          prompt={prompt}
          setPrompt={setPrompt}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          activeParamId={activeParamId}
          setActiveParamId={setActiveParamId}
          paramSelections={paramSelections}
          setParamSelections={setParamSelections}
          displayBalance={displayBalance}
          modelGradient={modelGradient}
        />

        <TaskSidebar
          taskPanelOpen={taskPanelOpen}
          setTaskPanelOpen={setTaskPanelOpen}
          taskSearch={taskSearch}
          setTaskSearch={setTaskSearch}
          activePanel={activePanel}
          activeAgentId={activeAgentId}
          activeModel={activeModel}
          filteredTasks={filteredTasks}
          previewTask={previewTask}
          setPreviewTask={setPreviewTask}
        />
      </div>
    </div>
  );
}
