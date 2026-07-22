import { Search, Film, Sparkles, User, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { primaryCategories, secondaryCategories } from '@/data/models';
import type { AIModel } from '@/data/models';
import { agents as agentList } from '@/data/agents';
import type { Agent } from '@/data/agents';

const primaryIcons: Record<string, LucideIcon> = {
  damoxing: Sparkles,
  zhinengti: User,
  linggan: Lightbulb,
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

interface ModelSidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  primaryTab: string;
  onPrimaryTabChange: (id: string) => void;
  secondaryTab: string;
  onSecondaryTabChange: (id: string) => void;
  filteredModels: AIModel[];
  activeModelId: string;
  onModelSelect: (model: AIModel) => void;
  activePanel: 'model' | 'manju' | 'agent';
  setActivePanel: (panel: 'model' | 'manju' | 'agent') => void;
  activeAgentId: string | null;
  setActiveAgentId: (id: string | null) => void;
}

export function ModelSidebar({
  searchQuery,
  onSearchChange,
  primaryTab,
  onPrimaryTabChange,
  secondaryTab,
  onSecondaryTabChange,
  filteredModels,
  activeModelId,
  onModelSelect,
  activePanel,
  setActivePanel,
  activeAgentId,
  setActiveAgentId,
}: ModelSidebarProps) {
  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-white/[0.025] backdrop-blur-xl">
      <div className="p-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-cyan-400/70 transition" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
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
              onClick={() => onPrimaryTabChange(cat.id)}
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
            onClick={() => onSecondaryTabChange(cat.id)}
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
                onClick={() => onModelSelect(model)}
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
                    {model.icon.startsWith('http') ? (
                      <img
                        src={model.icon}
                        alt={model.name}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      model.icon
                    )}
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
                  onClick={() => {
                    setActiveAgentId(null);
                    setActivePanel('manju');
                  }}
                  className={`block w-full px-3 py-3 rounded-xl text-left transition-all border ${
                    activePanel === 'manju'
                      ? 'border-fuchsia-500/40 bg-fuchsia-500/10'
                      : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12]'
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
                  const filtered =
                    secondaryTab === 'all'
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
                        onClick={() => {
                          setActiveAgentId(agent.id);
                          setActivePanel('agent');
                        }}
                        className={`block w-full px-3 py-3 rounded-xl text-left transition-all border ${
                          isActive
                            ? 'border-purple-500/40 bg-purple-500/10'
                            : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                              gradientMap[agent.category] || 'from-purple-500 to-indigo-500'
                            } flex items-center justify-center text-lg shadow-lg`}
                          >
                            {agent.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {agent.name}
                              </span>
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
  );
}
