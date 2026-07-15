import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { agents } from '@/data/agents';
import type { Agent } from '@/data/agents';

const categoryTabs: { id: Agent['category'] | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: '全部', emoji: '🤖' },
  { id: 'chat', label: '对话', emoji: '💬' },
  { id: 'image', label: '图片', emoji: '🎨' },
  { id: 'video', label: '视频', emoji: '🎬' },
];

function getCategoryLabel(category: Agent['category']): string {
  switch (category) {
    case 'chat':
      return '对话';
    case 'image':
      return '图片';
    case 'video':
      return '视频';
  }
}

function getCategoryBadgeClass(category: Agent['category']): string {
  switch (category) {
    case 'chat':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/20';
    case 'image':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
    case 'video':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/20';
  }
}

export default function AgentListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Agent['category'] | 'all'>('all');

  const filteredAgents = useMemo(() => {
    let list = agents;

    if (activeCategory !== 'all') {
      list = list.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 背景装饰 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,210,255,0.06) 0%, transparent 45%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 头部区域 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            智能体工作流
          </h1>
          <p className="text-white/50 text-base sm:text-lg">选择一个智能体，一键开始创作</p>
        </div>

        {/* 搜索框 */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-[#8b5cf6] transition" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索智能体名称、功能..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#8b5cf6]/40 focus:bg-white/[0.06] focus:outline-none transition backdrop-blur-sm"
            />
          </div>
        </div>

        {/* 分类筛选 Tab */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                activeCategory === tab.id
                  ? 'bg-[#8b5cf6]/15 text-[#a78bfa] border-[#8b5cf6]/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                  : 'bg-white/[0.03] text-white/60 border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80 hover:border-white/[0.12]'
              }`}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 卡片网格 */}
        {filteredAgents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm">未找到匹配的智能体</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredAgents.map((agent) => (
              <Link
                key={agent.id}
                to={`/agents/${agent.id}`}
                className="group relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#8b5cf6]/5 hover:border-[#8b5cf6]/20 hover:-translate-y-1"
              >
                {/* 顶部渐变装饰线 */}
                <div
                  className={`absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r opacity-40 group-hover:opacity-100 transition-opacity ${agent.gradient}`}
                />

                {/* Emoji 图标 */}
                <div className="text-4xl sm:text-5xl mb-4 select-none">{agent.icon}</div>

                {/* 名称 */}
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 group-hover:text-[#a78bfa] transition-colors">
                  {agent.name}
                </h3>

                {/* 描述 */}
                <p className="text-xs sm:text-sm text-white/50 line-clamp-2 mb-3 leading-relaxed">
                  {agent.description}
                </p>

                {/* 分类标签 */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${getCategoryBadgeClass(
                      agent.category
                    )}`}
                  >
                    {getCategoryLabel(agent.category)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.06] text-white/50 border border-white/[0.08]">
                    {agent.model}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-white/40 border border-white/[0.06]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 开始使用按钮 */}
                <div className="mt-4 flex items-center gap-1.5 text-xs text-[#8b5cf6] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="font-medium">开始使用</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
