import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Copy,
  RotateCcw,
  Sparkles,
  User,
  Check,
  Square,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAgentById } from '@/data/agents';
import type { Agent } from '@/data/agents';
import type { AIModel } from '@/data/models';
import ImageWorkbench from '@/components/workbench/ImageWorkbench';
import VideoWorkbench from '@/components/workbench/VideoWorkbench';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { useAccountStore } from '@/store/useAccountStore';
import { useStore } from '@/store/useStore';

/* ── 简单的 Markdown 渲染 ── */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            if (className) {
              const codeStr = String(children).replace(/\n$/, '');
              return (
                <div className="relative my-3 rounded-xl overflow-hidden border border-white/[0.06]">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-[#16161a] border-b border-white/[0.06]">
                    <span className="text-[11px] text-[#71717a] font-mono">
                      {className.replace('language-', '')}
                    </span>
                  </div>
                  <pre className="bg-[#0d0d0f] p-4 overflow-x-auto">
                    <code className="text-xs text-[#e4e4e7] font-mono leading-relaxed whitespace-pre">
                      {codeStr}
                    </code>
                  </pre>
                </div>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[#a78bfa] text-xs font-mono" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-xl border border-white/[0.06]">
                <table className="w-full text-sm border-collapse">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-[#16161a]">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-xs font-medium text-[#a1a1aa] border-b border-white/[0.06]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 text-sm text-[#e4e4e7] border-b border-white/[0.03]">{children}</td>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-2 transition-colors">
                {children}
              </a>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold text-white mt-5 mb-3">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-white mt-4 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-white mt-3 mb-2">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside ml-4 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside ml-4 my-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-sm text-[#e4e4e7] leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return <blockquote className="border-l-2 border-[#8b5cf6]/40 pl-4 my-3 text-[#a1a1aa] italic">{children}</blockquote>;
          },
          hr() {
            return <hr className="border-white/[0.06] my-4" />;
          },
          p({ children }) {
            return <p className="text-sm text-[#e4e4e7] leading-relaxed mb-2 last:mb-0">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-[#c0c0c6]">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ── Chat 类型智能体的轻量聊天界面 ── */
export function AgentChatView({ agent }: { agent: Agent }) {
  const conversations = useStore((s) => s.conversations);
  const loadConversations = useStore((s) => s.loadConversations);
  const createConversation = useStore((s) => s.createConversation);
  const addMessage = useStore((s) => s.addMessage);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typewriterRef = useRef<(() => void) | null>(null);
  const refreshBalance = useAccountStore((s) => s.refreshBalance);

  // 初始化：查找或创建当前Agent的conversation
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setIsLoadingHistory(true);
      try {
        // 确保conversations已加载
        if (conversations.length === 0) {
          await loadConversations();
        }
        if (cancelled) return;

        // 按 agent.id 查找已有对话
        const state = useStore.getState();
        const existing = state.conversations.find((c) => c.model === `agent:${agent.id}`);
        if (existing) {
          setConvId(existing.id);
          setMessages(existing.messages.map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })));
        } else {
          // 创建新对话
          const newConv = await createConversation(`${agent.name}`, `agent:${agent.id}`);
          if (!cancelled) {
            setConvId(newConv.id);
            setMessages([]);
          }
        }
      } catch {
        // 静默失败
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };
    init();
    return () => { cancelled = true; typewriterRef.current?.(); };
  }, [agent.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const typewriterEffect = useCallback(
    (fullContent: string, msgId: string) => {
      let index = 0;
      const speed = 25;
      abortRef.current = false;

      const timer = setInterval(() => {
        if (abortRef.current || index >= fullContent.length) {
          clearInterval(timer);
          if (!abortRef.current) {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
            );
          }
          setIsTyping(false);
          abortRef.current = false;
          return;
        }
        index++;
        const displayed = fullContent.slice(0, index);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: displayed } : m))
        );
      }, speed);

      return () => clearInterval(timer);
    },
    []
  );

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isTyping) return;
    setBillingError('');
    setInput('');

    const userMsg = { id: `msg-${Date.now()}`, role: 'user' as const, content };
    setMessages((prev) => [...prev, userMsg]);

    // 持久化用户消息到 conversation
    if (convId) {
      addMessage(convId, { id: userMsg.id, role: 'user', content, createdAt: new Date().toISOString() });
    }

    setIsTyping(true);
    abortRef.current = false;

    try {
      await runBillableTask({
        model: agent.model,
        category: 'chat',
        estimatedCost: await getEstimatedCost('chat', Math.ceil(content.length / 800)),
        description: `${agent.name} 聊天回复`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const apiMessages = [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const result = await api.post<{ id?: string; content?: string }>('/chat/message', {
            model: agent.model,
            messages: apiMessages,
            params: { system: agent.systemPrompt },
          });

          const fullContent = result.content || '模型未返回内容。';
          const assistantId = result.id || `msg-${Date.now()}-ai`;

          const assistantMsg: { id: string; role: 'assistant'; content: string } = {
            id: assistantId,
            role: 'assistant',
            content: '',
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // 持久化AI回复到 conversation
          if (convId) {
            addMessage(convId, { id: assistantId, role: 'assistant', content: fullContent, createdAt: new Date().toISOString() });
          }

          setTimeout(() => {
            typewriterRef.current?.();
            typewriterRef.current = typewriterEffect(fullContent, assistantId);
          }, 100);
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
      setIsTyping(false);
    }
  };

  const handleRegenerate = async (msgId: string) => {
    const msgs = messages;
    const aiIdx = msgs.findIndex((m) => m.id === msgId);
    if (aiIdx === -1) return;

    let lastUserContent = '';
    for (let i = aiIdx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserContent = msgs[i].content;
        break;
      }
    }
    if (!lastUserContent) return;

    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setIsTyping(true);
    abortRef.current = false;

    try {
      await runBillableTask({
        model: agent.model,
        category: 'chat',
        estimatedCost: await getEstimatedCost('chat', Math.ceil(lastUserContent.length / 800)),
        description: `${agent.name} 重新生成`,
        onBalanceChange: refreshBalance,
        run: async () => {
          // 在 run 回调内部重新获取最新 messages，避免过期闭包
          let latestMessages: typeof messages = [];
          setMessages(prev => { latestMessages = prev; return prev; });

          const apiMessages = latestMessages
            .filter((m) => m.id !== msgId)
            .map((m) => ({ role: m.role, content: m.content }));

          const result = await api.post<{ id?: string; content?: string }>('/chat/message', {
            model: agent.model,
            messages: apiMessages,
            params: { system: agent.systemPrompt },
          });

          const fullContent = result.content || '模型未返回内容。';
          const assistantId = result.id || `msg-${Date.now()}-ai`;

          const assistantMsg: { id: string; role: 'assistant'; content: string } = {
            id: assistantId,
            role: 'assistant',
            content: '',
          };
          setMessages((prev) => [...prev, assistantMsg]);

          setTimeout(() => {
            typewriterRef.current?.();
            typewriterRef.current = typewriterEffect(fullContent, assistantId);
          }, 100);
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
      setIsTyping(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const hasMessages = messages.length > 0 || isLoadingHistory;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
      {/* 消息列表 */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full text-white/30 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              加载对话历史...
            </div>
          ) : messages.length === 0 && !isTyping ? (
            null
          ) : (
            <>
              {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]'
                    : 'bg-gradient-to-br from-[#6366f1] to-[#a78bfa]'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>

              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col group`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#8b5cf6]/10 text-[10px] text-[#a78bfa] font-medium border border-[#8b5cf6]/15">
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      {agent.name}
                    </span>
                  </div>
                )}

                <div
                  className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#8b5cf6]/25 to-[#6366f1]/15 text-white rounded-tr-sm border border-[#8b5cf6]/20'
                      : 'bg-[#1c1c1e] text-[#e4e4e7] rounded-tl-sm border border-white/[0.06]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <MarkdownContent content={msg.content} />
                  )}
                </div>

                {/* 操作栏 */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {msg.role === 'assistant' && !isTyping && (
                    <>
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
                      >
                        <Copy className="w-3 h-3" />
                        复制
                      </button>
                      <button
                        onClick={() => handleRegenerate(msg.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                        重新生成
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* 输入中动画 */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a78bfa] flex-shrink-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col items-start gap-2">
                <div className="px-4 py-3 rounded-2xl bg-[#1c1c1e] border border-white/[0.06] rounded-tl-sm">
                  <div className="flex gap-1.5 items-center h-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '120ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
                <button
                  onClick={() => { abortRef.current = true; }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-[#a1a1aa] hover:text-white hover:bg-white/[0.1] transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  停止生成
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#6366f1]/10 border border-[#8b5cf6]/20 flex items-center justify-center shadow-2xl shadow-[#8b5cf6]/10">
            <span className="text-4xl select-none">{agent.icon}</span>
          </div>
          <div className="mt-5 text-center">
            <h3 className="text-lg font-semibold text-white mb-1">{agent.name}</h3>
            <p className="text-sm text-[#a1a1aa] max-w-md">{agent.description}</p>
          </div>
          <div className="mt-6 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] max-w-lg w-full">
            <p className="text-xs text-[#71717a] text-center">
              已加载专业系统提示词，发送消息即可开始
            </p>
          </div>
        </div>
      )}

      {/* 底部输入区 */}
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          {billingError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              {billingError}
            </div>
          )}

          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 shadow-lg">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`向 ${agent.name} 描述你的需求...`}
              className="w-full bg-transparent text-[#e4e4e7] placeholder-[#52525b] text-sm resize-none outline-none min-h-[56px] max-h-[200px]"
              rows={2}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#71717a] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#8b5cf6]" />
                  模型：{agent.model}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#71717a]">按 token 计费</span>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary, #8b5cf6), var(--accent-secondary, #6366f1))',
                    boxShadow: '0 0 20px rgba(139,92,246,0.25)',
                  }}
                >
                  {isTyping ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      发送
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 主页面 ── */
export default function AgentRunPage() {
  const { id } = useParams<{ id: string }>();
  const agent = id ? getAgentById(id) : undefined;

  if (!agent) {
    return <Navigate to="/agents" replace />;
  }

  // 将 Agent 映射为 AIModel 类型供 ImageWorkbench / VideoWorkbench 使用
  const agentAsModel: AIModel = {
    id: agent.model,
    name: agent.name,
    description: agent.description,
    category: agent.category === 'video' ? 'video' : agent.category === 'image' ? 'image' : 'chat',
    icon: agent.icon,
    tags: agent.tags,
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* 顶部栏 */}
      <header className="flex-shrink-0 h-14 flex items-center gap-4 px-4 sm:px-6 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
        <Link
          to="/agents"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">返回</span>
        </Link>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl select-none">{agent.icon}</span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{agent.name}</h1>
            <p className="text-xs text-white/40 truncate hidden sm:block">{agent.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#8b5cf6]/10 text-[11px] text-[#a78bfa] font-medium border border-[#8b5cf6]/15">
            {agent.model}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
              agent.category === 'chat'
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/15'
                : agent.category === 'image'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/15'
                : 'bg-orange-500/10 text-orange-300 border-orange-500/15'
            }`}
          >
            {agent.category === 'chat' ? '对话' : agent.category === 'image' ? '图片' : '视频'}
          </span>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {agent.category === 'chat' ? (
          <AgentChatView agent={agent} />
        ) : agent.category === 'image' ? (
          <ImageWorkbench model={agentAsModel} />
        ) : (
          <VideoWorkbench model={agentAsModel} />
        )}
      </main>
    </div>
  );
}
