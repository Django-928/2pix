import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Globe, Copy, RotateCcw, Sparkles, User } from 'lucide-react';
import type { AIModel } from '@/data/models';
import { useStore } from '@/store/useStore';
import { useAccountStore } from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { ModelLogo, DescriptionCard, SendButton, CostHint } from './shared';

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

/* ─────────────── 代码块高亮 ─────────────── */
function CodeBlock({ content }: { content: string }) {
  return (
    <pre className="bg-[#0d0d0f] border border-white/[0.06] rounded-lg p-3 overflow-x-auto my-2">
      <code className="text-xs text-[#a78bfa] font-mono leading-relaxed whitespace-pre">{content}</code>
    </pre>
  );
}

/* ─────────────── 解析消息内容（简单代码块检测） ─────────────── */
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^(\w+)\n/, '');
          return <CodeBlock key={i} content={code} />;
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
            {part}
          </p>
        );
      })}
    </>
  );
}

/* ─────────────── 聊天工作台 ─────────────── */
export default function ChatWorkbench({ model }: { model: AIModel }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [billingError, setBillingError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { conversations, currentConversationId, createConversation, selectConversation, addMessage } = useStore();
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

  const handleSend = async () => {
    if (!message.trim() || !currentConversationId) return;
    setBillingError('');
    const content = message;
    const userMessage = { id: `msg-${Date.now()}`, role: 'user' as const, content: message, createdAt: new Date().toISOString() };
    addMessage(currentConversationId, userMessage);
    setMessage('');
    setIsTyping(true);
    try {
      await runBillableTask({
        model: model.id,
        category: 'chat',
        estimatedCost: getEstimatedCost('chat', Math.ceil(content.length / 800)),
        description: `${model.name} 聊天回复`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/chat/message', {
            model: model.id,
            messages: [...(currentConversation?.messages || []), userMessage],
          });
          const assistantMessage = {
            id: result.id || `msg-${Date.now()}`,
            role: 'assistant' as const,
            content: `${result.content || '模型未返回内容。'}\n\n[${result.providerMode === 'upstream' ? '真实上游' : 'Mock兜底'} · ${result.provider || 'mock'} · ${result.upstreamModel || model.id}]`,
            createdAt: new Date().toISOString(),
          };
          addMessage(currentConversationId, assistantMessage);
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
          {currentConversation?.messages.map((msg) => (
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

              {/* 气泡 */}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#8b5cf6]/25 to-[#6366f1]/15 text-white rounded-tr-sm border border-[#8b5cf6]/20'
                      : 'bg-[var(--bg-card,#1c1c1e)] text-[#e4e4e7] rounded-tl-sm border border-white/[0.06]'
                  }`}
                >
                  <MessageContent content={msg.content} />
                </div>

                {/* 操作栏（仅 assistant） */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => handleCopy(msg.content)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
                    >
                      <Copy className="w-3 h-3" />
                      复制
                    </button>
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.04] transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重新生成
                    </button>
                    <span className="text-[10px] text-[#52525b]">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <span className="text-[10px] text-[#52525b] mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* 输入中动画 */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a78bfa] flex-shrink-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
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

          {/* 输入框容器 */}
          <div className="relative rounded-2xl bg-[var(--bg-card,#1c1c1e)] border border-white/[0.08] p-4 shadow-lg">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
              </div>

              <div className="flex items-center gap-3">
                <CostHint text="按 token 计费" />
                <SendButton
                  onClick={handleSend}
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
