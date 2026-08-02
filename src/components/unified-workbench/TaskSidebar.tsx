import { useState } from 'react';
import { Search, ChevronRight, Clock, MoreHorizontal, X, Download, Image as ImageIcon, Wand2, Copy, Check } from 'lucide-react';
import type { AIModel } from '@/data/models';
import type { Project } from '@/types';
import { useStore } from '@/store/useStore';
import { useFileDownload } from '@/hooks/useFileDownload';
import { useToast } from '@/components/ui/Toast';

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

interface TaskSidebarProps {
  taskPanelOpen: boolean;
  setTaskPanelOpen: (open: boolean) => void;
  taskSearch: string;
  setTaskSearch: (value: string) => void;
  activePanel: 'model' | 'manju' | 'agent';
  activeAgentId: string | null;
  activeModel: AIModel;
  filteredTasks: Project[];
  previewTask: Project | null;
  setPreviewTask: (task: Project | null) => void;
  onUseAsReference?: (url: string) => void;
  onUpscale?: (task: Project) => void;
}

export function TaskSidebar({
  taskPanelOpen,
  setTaskPanelOpen,
  taskSearch,
  setTaskSearch,
  activePanel,
  activeAgentId,
  activeModel,
  filteredTasks,
  previewTask,
  setPreviewTask,
  onUseAsReference,
  onUpscale,
}: TaskSidebarProps) {
  const conversations = useStore((s) => s.conversations);
  const download = useFileDownload();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const modelFilter = activePanel === 'agent' && activeAgentId ? `agent:${activeAgentId}` : activeModel.id;
  const filteredConversations = conversations
    .filter((c) => c.model === modelFilter)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const showConversations = (activePanel === 'agent' && activeAgentId) || activeModel.category === 'chat';

  const copyText = async (text: string, key: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(successMsg);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleDownload = () => {
    if (!previewTask?.outputUrl) return;
    const ext = previewTask.type === 'video' ? 'mp4' : previewTask.type === 'audio' ? 'mp3' : 'png';
    download({
      url: previewTask.outputUrl,
      filename: `${previewTask.name.slice(0, 40) || previewTask.type}-${Date.now()}.${ext}`,
      fallback: () => window.open(previewTask.outputUrl, '_blank'),
    });
  };

  const handleUseAsReference = () => {
    if (!previewTask?.outputUrl) return;
    if (onUseAsReference) {
      onUseAsReference(previewTask.outputUrl);
      toast.success('已设为当前模型的参考图');
    } else {
      copyText(previewTask.outputUrl, 'reference', '参考图链接已复制，可在生成页上传使用');
    }
  };

  const handleUpscale = () => {
    if (!previewTask) return;
    if (onUpscale) {
      onUpscale(previewTask);
    } else {
      const prompt = typeof previewTask.inputParams?.prompt === 'string' ? previewTask.inputParams.prompt : previewTask.name;
      copyText(prompt, 'upscale', '提示词已复制，可切换至高分辨率模型重新生成');
    }
  };

  const handleCopyPrompt = () => {
    if (!previewTask) return;
    const prompt = typeof previewTask.inputParams?.prompt === 'string' ? previewTask.inputParams.prompt : previewTask.name;
    copyText(prompt, 'prompt', '提示词已复制');
  };

  return (
    <>
      <aside
        className={`relative flex-shrink-0 border-l border-white/[0.06] bg-white/[0.025] backdrop-blur-xl transition-all duration-300 overflow-hidden ${
          taskPanelOpen ? 'w-[300px]' : 'w-12'
        }`}
      >
        <button
          type="button"
          onClick={() => setTaskPanelOpen(!taskPanelOpen)}
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
              <button type="button" className="text-xs text-white/40 hover:text-white transition">
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
              {showConversations ? (
                // 聊天/Agent模式：显示对话历史
                <>
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-10">
                      <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-white/40 text-xs">暂无对话记录</p>
                      <p className="text-white/25 text-xs mt-1">开始对话后记录会出现在这里</p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
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
                                  {lastMsg.role === 'user' ? '你：' : 'AI：'}
                                  {lastMsg.content.slice(0, 60)}
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
                    })
                  )}
                </>
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
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/[0.08]"
                          />
                        )}
                        {!task.outputUrl && (
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getModelGradient(
                              activeModel.category
                            )} flex items-center justify-center text-[10px] font-bold shadow-md flex-shrink-0 overflow-hidden`}
                            style={
                              activeModel.icon.startsWith('http') || activeModel.icon.startsWith('/')
                                ? { padding: 0, background: 'transparent' }
                                : {}
                            }
                          >
                            {activeModel.icon.startsWith('http') || activeModel.icon.startsWith('/') ? (
                              <img
                                src={activeModel.icon}
                                alt={activeModel.name}
                                loading="lazy"
                                decoding="async"
                                className="w-8 h-8 rounded-lg object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              activeModel.icon
                            )}
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
            <button
              onClick={() => setPreviewTask(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition"
            >
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

              {/* ───── 操作按钮栏（参考即梦） ───── */}
              {previewTask.outputUrl && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 hover:bg-white/[0.10] hover:text-white transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载
                  </button>
                  {(previewTask.type === 'image' || previewTask.type === 'video') && (
                    <button
                      type="button"
                      onClick={handleUseAsReference}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 hover:bg-white/[0.10] hover:text-white transition"
                    >
                      {copiedKey === 'reference' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      用作参考图
                    </button>
                  )}
                  {previewTask.type === 'image' && (
                    <button
                      type="button"
                      onClick={handleUpscale}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 hover:bg-white/[0.10] hover:text-white transition"
                    >
                      {copiedKey === 'upscale' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Wand2 className="w-3.5 h-3.5" />}
                      提升分辨率
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 hover:bg-white/[0.10] hover:text-white transition"
                  >
                    {copiedKey === 'prompt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    复制提示词
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-white">{previewTask.name}</h3>
                <div className="flex gap-2 text-[10px] text-white/40">
                  <span className="px-2 py-0.5 rounded bg-white/[0.06]">{previewTask.type}</span>
                  {previewTask.model && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.06]">{previewTask.model}</span>
                  )}
                  {previewTask.provider && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.06]">{previewTask.provider}</span>
                  )}
                </div>
                <p className="text-xs text-white/30">{new Date(previewTask.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
