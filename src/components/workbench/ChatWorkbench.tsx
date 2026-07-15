import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Globe, Copy, RotateCcw, Sparkles, User, Check, Square, Pencil, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { AIModel } from '@/data/models';
import { useStore } from '@/store/useStore';
import { useAccountStore } from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { ModelLogo, DescriptionCard, SendButton, CostHint } from './shared';

/* ── KaTeX CSS ── */
// We rely on the KaTeX CSS loaded via CDN in index.html or via rehype-katex's bundled styles.
// For safety, we also load it here via a link if not already present.
if (typeof document !== 'undefined' && !document.getElementById('katex-css')) {
  const link = document.createElement('link');
  link.id = 'katex-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  document.head.appendChild(link);
}

interface ProviderGenerationResponse {
  id: string;
  url?: string;
  content?: string;
  status?: string;
  providerMode?: 'upstream' | 'mock';
  provider?: string;
  upstreamModel?: string;
}

/* ─────────────── 快捷提示词卡片 ─────────────── */
function PromptCard({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#8b5cf6]/30 hover:bg-[rgba(139,92,246,0.08)] transition-all text-left group"
    >
      <p className="text-sm text-[#c0c0c6] group-hover:text-white transition-colors line-clamp-2">{text}</p>
    </button>
  );
}

/* ─────────────── 快捷指令标签 ─────────────── */
function QuickTag({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-[#a1a1aa] hover:text-white hover:bg-[rgba(139,92,246,0.12)] hover:border-[#8b5cf6]/30 transition-all whitespace-nowrap"
    >
      {label}
    </button>
  );
}

/* ─────────────── 代码块（带复制按钮） ─────────────── */
function CodeBlockWithCopy({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-white/[0.06]">
      {/* 代码块头部 */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#16161a] border-b border-white/[0.06]">
        <span className="text-[11px] text-[#71717a] font-mono">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-[#71717a] hover:text-white hover:bg-white/[0.08] transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {/* 代码内容 */}
      <pre className="bg-[#0d0d0f] p-4 overflow-x-auto">
        <code className="text-xs text-[#e4e4e7] font-mono leading-relaxed whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}

/* ─────────────── Markdown 渲染组件 ─────────────── */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // 代码块
          code({ className, children, ...props }) {
            const codeStr = String(children).replace(/\n$/, '');
            // 判断是否为代码块（有 className 表示 fenced code block）
            if (className) {
              return <CodeBlockWithCopy className={className}>{codeStr}</CodeBlockWithCopy>;
            }
            // 行内代码
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[#a78bfa] text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // 表格
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
              <td className="px-4 py-2 text-sm text-[#e4e4e7] border-b border-white/[0.03]">
                {children}
              </td>
            );
          },
          // 链接
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8b5cf6] hover:text-[#a78bfa] underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },
          // 标题
          h1({ children }) {
            return <h1 className="text-xl font-bold text-white mt-5 mb-3">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-white mt-4 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-white mt-3 mb-2">{children}</h3>;
          },
          // 列表
          ul({ children }) {
            return <ul className="list-disc list-outside ml-4 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside ml-4 my-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-sm text-[#e4e4e7] leading-relaxed">{children}</li>;
          },
          // 引用
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-[#8b5cf6]/40 pl-4 my-3 text-[#a1a1aa] italic">
                {children}
              </blockquote>
            );
          },
          // 分割线
          hr() {
            return <hr className="border-white/[0.06] my-4" />;
          },
          // 段落
          p({ children }) {
            return <p className="text-sm text-[#e4e4e7] leading-relaxed mb-2 last:mb-0">{children}</p>;
          },
          // 任务列表复选框
          input({ checked, disabled, ...props }) {
            return (
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                className="mr-2 accent-[#8b5cf6]"
                {...props}
              />
            );
          },
          // 删除线
          del({ children }) {
            return <del className="text-[#71717a]">{children}</del>;
          },
          // 强调
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

/* ─────────────── 消息操作栏 ─────────────── */
function MessageActions({
  msg,
  onCopy,
  onRegenerate,
  onEdit,
}: {
  msg: { id: string; content: string; role: string; createdAt: string };
  onCopy: (text: string) => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
        title="复制"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        {copied ? '已复制' : '复制'}
      </button>
      {msg.role === 'assistant' && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
          title="重新生成"
        >
          <RotateCcw className="w-3 h-3" />
          重新生成
        </button>
      )}
      {msg.role === 'user' && onEdit && (
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
          title="编辑"
        >
          <Pencil className="w-3 h-3" />
          编辑
        </button>
      )}
      <span className="text-[10px] text-[#52525b] ml-1">
        {new Date(msg.createdAt).toLocaleTimeString()}
      </span>
    </div>
  );
}

/* ─────────────── 聊天工作台 ─────────────── */
export default function ChatWorkbench({ model }: { model: AIModel }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef(false);
  const streamContentRef = useRef('');
  const typewriterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { typewriterRef.current?.(); };
  }, []);

  const { conversations, currentConversationId, createConversation, selectConversation, addMessage } =
    useStore();
  const refreshBalance = useAccountStore((s) => s.refreshBalance);
  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (!currentConversationId) {
      (async () => {
        const newConv = await createConversation('新对话', model.name);
        selectConversation(newConv.id);
      })();
    }
    // 仅在模型切换时初始化会话，避免会话状态变化时重复创建对话。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id]);

  /* ── 打字机效果 ── */
  const typewriterEffect = useCallback(
    (fullContent: string, conversationId: string, msgId: string) => {
      let index = 0;
      const speed = 30; // 每30ms一个字符
      abortRef.current = false;

      const timer = setInterval(() => {
        if (abortRef.current || index >= fullContent.length) {
          clearInterval(timer);
          if (abortRef.current) {
            // 用户中断，用当前已显示的内容作为最终消息
            streamContentRef.current = fullContent.slice(0, index);
          } else {
            streamContentRef.current = fullContent;
          }
          setIsTyping(false);
          abortRef.current = false;
          return;
        }
        index++;
        // 更新消息内容 - 逐字追加
        const displayed = fullContent.slice(0, index);
        streamContentRef.current = displayed;

        // 通过 zustand store 更新消息
        useStore.setState((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === msgId
                      ? { ...m, content: displayed }
                      : m
                  ),
                }
              : conv
          ),
        }));
      }, speed);

      return () => {
        clearInterval(timer);
      };
    },
    []
  );

  /* ── 发送消息 ── */
  const handleSend = async (overrideContent?: string) => {
    const contentToSend = overrideContent || message;
    if (!contentToSend.trim() || !currentConversationId) return;
    setBillingError('');

    // 记录编辑模式状态后立即清除
    const wasEditing = editingMsgId;
    const editingId = editingMsgId;
    setEditingMsgId(null);

    // 如果是编辑模式，先更新该用户消息并删除之后的所有消息
    if (wasEditing && editingId) {
      useStore.setState((state) => ({
        conversations: state.conversations.map((conv) => {
          if (conv.id !== currentConversationId) return conv;
          const editIdx = conv.messages.findIndex((m) => m.id === editingId);
          if (editIdx === -1) return conv;
          return {
            ...conv,
            messages: [
              ...conv.messages.slice(0, editIdx),
              { ...conv.messages[editIdx], content: contentToSend },
            ],
          };
        }),
      }));
      setMessage('');
      setEditContent('');
    } else {
      // 正常发送：添加新的用户消息
      const userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        content: contentToSend,
        createdAt: new Date().toISOString(),
      };
      addMessage(currentConversationId, userMessage);
      setMessage('');
    }

    setIsTyping(true);
    abortRef.current = false;

    try {
      await runBillableTask({
        model: model.id,
        category: 'chat',
        estimatedCost: getEstimatedCost('chat', Math.ceil(contentToSend.length / 800)),
        description: `${model.name} 聊天回复`,
        onBalanceChange: refreshBalance,
        run: async () => {
          // 构建发送给 API 的消息列表
          const state = useStore.getState();
          const conv = state.conversations.find((c) => c.id === currentConversationId);
          const apiMessages = conv ? [...conv.messages] : [];

          const result = await api.post<ProviderGenerationResponse>('/chat/message', {
            model: model.id,
            messages: apiMessages,
          });

          const fullContent = result.content || '模型未返回内容。';

          const assistantId = result.id || `msg-${Date.now()}`;

          // 先添加一个空消息
          const assistantMessage = {
            id: assistantId,
            role: 'assistant' as const,
            content: '',
            createdAt: new Date().toISOString(),
          };
          addMessage(currentConversationId!, assistantMessage);

          // 开始打字机效果
          setTimeout(() => {
            typewriterRef.current?.();
            typewriterRef.current = typewriterEffect(fullContent, currentConversationId!, assistantId);
          }, 100);
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
      setIsTyping(false);
    }
  };

  /* ── 停止生成 ── */
  const handleStopGeneration = () => {
    abortRef.current = true;
  };

  /* ── 重新生成 ── */
  const handleRegenerate = async (msgId: string) => {
    if (!currentConversationId || !currentConversation) return;

    // 找到该 AI 消息之前的用户消息
    const msgs = currentConversation.messages;
    const aiIdx = msgs.findIndex((m) => m.id === msgId);
    if (aiIdx === -1) return;

    // 找到该 AI 消息之前的最后一条用户消息
    let lastUserMsgContent = '';
    for (let i = aiIdx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserMsgContent = msgs[i].content;
        break;
      }
    }
    if (!lastUserMsgContent) return;

    // 删除该 AI 消息
    useStore.setState((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, messages: conv.messages.filter((m) => m.id !== msgId) }
          : conv
      ),
    }));

    // 重新发送
    setIsTyping(true);
    abortRef.current = false;

    try {
      await runBillableTask({
        model: model.id,
        category: 'chat',
        estimatedCost: getEstimatedCost('chat', Math.ceil(lastUserMsgContent.length / 800)),
        description: `${model.name} 重新生成`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const apiMessages = currentConversation.messages.filter((m) => m.id !== msgId);
          const result = await api.post<ProviderGenerationResponse>('/chat/message', {
            model: model.id,
            messages: apiMessages,
          });

          const fullContent = result.content || '模型未返回内容。';
          const assistantId = result.id || `msg-${Date.now()}`;

          const assistantMessage = {
            id: assistantId,
            role: 'assistant' as const,
            content: '',
            createdAt: new Date().toISOString(),
          };
          addMessage(currentConversationId!, assistantMessage);

          setTimeout(() => {
            typewriterRef.current?.();
            typewriterRef.current = typewriterEffect(fullContent, currentConversationId!, assistantId);
          }, 100);
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
      setIsTyping(false);
    }
  };

  /* ── 编辑用户消息 ── */
  const handleStartEdit = (msgId: string, content: string) => {
    setEditingMsgId(msgId);
    setEditContent(content);
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditContent('');
  };

  /* ── 复制消息 ── */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  /* ── 自动调整 textarea 高度 ── */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  /* ── 快捷指令 ── */
  const quickTags = useMemo(() => ['翻译为英文', '总结要点', '写一段代码', '解释这段代码', '续写', '优化文本'], []);

  const samplePrompts = [
    '用 Python 写一个快速排序算法，并解释时间复杂度',
    '帮我写一封正式的商务合作邮件，语气专业且友好',
    '分析 2024 年 AI 行业的发展趋势，列出三个关键方向',
    '将以下中文翻译成英文，保持学术写作的正式语气',
  ];

  const hasMessages = currentConversation && currentConversation.messages.length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-workbench, #0a0a0a)' }}>
      {/* ── 消息列表 ── */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {currentConversation?.messages.map((msg) => {
            // 编辑模式下的用户消息
            if (msg.id === editingMsgId) {
              return (
                <div key={msg.id} className="flex gap-3 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-[80%] flex flex-col items-end group">
                    <div className="relative w-full rounded-2xl bg-gradient-to-br from-[#8b5cf6]/25 to-[#6366f1]/15 border border-[#8b5cf6]/20 p-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        autoFocus
                        className="w-full bg-transparent text-[#e4e4e7] text-sm resize-none outline-none min-h-[56px] max-h-[200px]"
                        rows={3}
                      />
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-lg text-xs text-[#71717a] hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.06]"
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          取消
                        </button>
                        <button
                          onClick={() => handleSend(editContent)}
                          className="px-3 py-1.5 rounded-lg text-xs text-white transition-all border border-[#8b5cf6]/30"
                          style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                          }}
                        >
                          <Send className="w-3 h-3 inline mr-1" />
                          保存并重新发送
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* 头像 */}
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

                {/* 气泡 + 操作栏 */}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col group`}>
                  {/* AI 消息模型标签 */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#8b5cf6]/10 text-[10px] text-[#a78bfa] font-medium border border-[#8b5cf6]/15">
                        <Sparkles className="w-2.5 h-2.5 mr-1" />
                        {model.name}
                      </span>
                    </div>
                  )}

                  <div
                    className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#8b5cf6]/25 to-[#6366f1]/15 text-white rounded-tr-sm border border-[#8b5cf6]/20'
                        : 'bg-[var(--bg-card,#1c1c1e)] text-[#e4e4e7] rounded-tl-sm border border-white/[0.06]'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>

                  {/* 操作栏 */}
                  <MessageActions
                    msg={msg}
                    onCopy={handleCopy}
                    onRegenerate={msg.role === 'assistant' && !isTyping ? () => handleRegenerate(msg.id) : undefined}
                    onEdit={msg.role === 'user' && !isTyping ? () => handleStartEdit(msg.id, msg.content) : undefined}
                  />
                </div>
              </div>
            );
          })}

          {/* 输入中动画 + 停止生成 */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a78bfa] flex-shrink-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col items-start gap-2">
                {/* 如果正在打字机输出中且有内容，不需要 loading 动画 */}
                {streamContentRef.current === '' && (
                  <div className="px-4 py-3 rounded-2xl bg-[var(--bg-card,#1c1c1e)] border border-white/[0.06] rounded-tl-sm">
                    <div className="flex gap-1.5 items-center h-5">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce"
                        style={{ animationDelay: '120ms' }}
                      />
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce"
                        style={{ animationDelay: '240ms' }}
                      />
                    </div>
                  </div>
                )}
                {/* 停止生成按钮 */}
                <button
                  onClick={handleStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-[#a1a1aa] hover:text-white hover:bg-white/[0.1] transition-all"
                >
                  <Square className="w-3 h-3 fill-current" />
                  停止生成
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── 空状态 ── */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#6366f1]/10 border border-[#8b5cf6]/20 flex items-center justify-center shadow-2xl shadow-[#8b5cf6]/10">
            <ModelLogo model={model} />
          </div>
          <div className="mt-5">
            <DescriptionCard model={model} />
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
            {samplePrompts.map((text, i) => (
              <PromptCard key={i} text={text} onClick={() => setMessage(text)} />
            ))}
          </div>
        </div>
      )}

      {/* ── 底部输入区 ── */}
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          {/* 模型名称 */}
          <div className="flex items-center justify-center mb-2">
            <span className="text-xs text-[#71717a] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#8b5cf6]" />
              当前模型：{model.name}
            </span>
          </div>

          {billingError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              {billingError}
            </div>
          )}

          {/* 快捷指令标签 */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {quickTags.map((tag) => (
              <QuickTag key={tag} label={tag} onClick={() => setMessage((prev) => prev ? prev + ' ' + tag : tag)} />
            ))}
          </div>

          {/* 输入框容器 */}
          <div className="relative rounded-2xl bg-[var(--bg-card,#1c1c1e)] border border-white/[0.08] p-4 shadow-lg">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`描述你的需求或粘贴代码，${model.name} ${model.description.slice(0, 30)}...`}
              className="w-full bg-transparent text-[#e4e4e7] placeholder-[#52525b] text-sm resize-none outline-none min-h-[56px] max-h-[200px]"
              rows={2}
            />

            {/* 底部工具栏 */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                {/* 联网搜索 */}
                <button
                  onClick={() => setWebSearch(!webSearch)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    webSearch
                      ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                      : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>联网搜索</span>
                </button>

                {/* 温度参数（视觉占位，不可交互变更） */}
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.03] text-[#71717a] border border-white/[0.06]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                  综合最优
                </div>

                {/* Shift+Enter 提示 */}
                <div className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-[10px] text-[#52525b]">
                  <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px]">Shift</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px]">Enter</kbd>
                  <span>换行</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CostHint text="按 token 计费" />
                <SendButton
                  onClick={() => handleSend()}
                  disabled={!message.trim() || isTyping}
                  loading={isTyping}
                  text="发送"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
