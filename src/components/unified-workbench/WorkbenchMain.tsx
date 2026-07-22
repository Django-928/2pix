import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ChevronRight,
  Film,
  ImagePlus,
  Mic,
  Lightbulb,
  RefreshCw,
  HelpCircle,
  Pencil,
  Cpu,
  Droplets,
  Clapperboard,
  Aperture,
  Type,
  Gauge,
  Camera,
  Smile,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AIModel } from '@/data/models';
import { getAgentById } from '@/data/agents';
import type { Agent } from '@/data/agents';
import { AgentChatView } from '@/pages/AgentRunPage';
import ChatWorkbench from '@/components/workbench/ChatWorkbench';
import ImageWorkbench from '@/components/workbench/ImageWorkbench';
import VideoWorkbench from '@/components/workbench/VideoWorkbench';

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

interface WorkbenchMainProps {
  activePanel: 'model' | 'manju' | 'agent';
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
  setActivePanel: (panel: 'model' | 'manju' | 'agent') => void;
  activeModel: AIModel;
  prompt: string;
  setPrompt: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  activeParamId: string | null;
  setActiveParamId: (id: string | null) => void;
  paramSelections: Record<string, string>;
  setParamSelections: Dispatch<SetStateAction<Record<string, string>>>;
  displayBalance: number;
  modelGradient: string;
}

export function WorkbenchMain({
  activePanel,
  activeAgentId,
  setActiveAgentId,
  setActivePanel,
  activeModel,
  prompt,
  setPrompt,
  isGenerating,
  onGenerate,
  activeParamId,
  setActiveParamId,
  paramSelections,
  setParamSelections,
  displayBalance,
  modelGradient,
}: WorkbenchMainProps) {
  const activeParam = useMemo(
    () => paramConfig.find((p) => p.id === activeParamId) || null,
    [activeParamId]
  );

  if (activePanel === 'agent' && activeAgentId) {
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
            onClick={() => {
              setActiveAgentId(null);
              setActivePanel('model');
            }}
            className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-lg`}
          >
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
            <ImageWorkbench
              model={{
                id: agent.model,
                name: agent.name,
                description: agent.description,
                icon: agent.icon,
                category: 'image',
                tags: [],
              }}
            />
          ) : (
            <VideoWorkbench
              model={{
                id: agent.model,
                name: agent.name,
                description: agent.description,
                icon: agent.icon,
                category: 'video',
                tags: [],
              }}
            />
          )}
        </div>
      </main>
    );
  }

  if (activePanel === 'manju') {
    return (
      <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <button
            onClick={() => {
              setActivePanel('model');
            }}
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
          <Link
            to="/manju"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm shadow-lg hover:scale-105 transition-transform"
          >
            <Sparkles className="w-4 h-4" />
            进入漫剧工坊
          </Link>
        </div>
      </main>
    );
  }

  return (
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
              {activeModel.icon.startsWith('http') ? (
                <img
                  src={activeModel.icon}
                  alt={activeModel.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-2xl font-bold text-white">{activeModel.icon}</span>
              )}
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

            {/* 参数 pills + 生成按钮（audio 不显示图片/视频参数） */}
            {activeModel.category !== 'audio' && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {paramConfig.map((param) => (
                    <button
                      key={param.id}
                      type="button"
                      onClick={() => setActiveParamId(activeParamId === param.id ? null : param.id)}
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
                  onClick={onGenerate}
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
            )}

            {/* 参数抽屉（audio 不显示） */}
            {activeModel.category !== 'audio' && (
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
            )}

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
  );
}
