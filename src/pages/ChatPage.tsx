import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, RefreshCw, Plus, User, Bot, Trash2, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import useAccountStore from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import type { Message } from '@/types';

interface ProviderGenerationResponse {
  id: string;
  content?: string;
  providerMode?: 'upstream' | 'mock';
  provider?: string;
  upstreamModel?: string;
}

const models = [
  { id: 'gpt-4', name: 'GPT-4', description: '最强大的AI模型', icon: '🤖' },
  { id: 'gpt-3.5', name: 'GPT-3.5', description: '快速高效', icon: '⚡' },
  { id: 'claude-3', name: 'Claude 3', description: '长上下文', icon: '🦜' },
  { id: 'llama-3', name: 'Llama 3', description: '开源模型', icon: '🦙' },
];

const promptTemplates = [
  { id: 'creative', name: '创意写作', prompt: '帮我创作一个有趣的故事开头...' },
  { id: 'marketing', name: '营销文案', prompt: '为新产品写一段吸引人的广告语...' },
  { id: 'code', name: '代码生成', prompt: '帮我写一个React组件实现...' },
  { id: 'summary', name: '内容总结', prompt: '请总结以下内容的要点...' },
  { id: 'translate', name: '翻译', prompt: '将以下内容翻译成英文...' },
  { id: 'ideas', name: '灵感生成', prompt: '给我一些关于主题的创意想法...' },
];

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-4');
  const [billingError, setBillingError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { conversations, currentConversationId, createConversation, selectConversation, addMessage } = useStore();
  const refreshBalance = useAccountStore((state) => state.refreshBalance);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleSend = async () => {
    if (!message.trim() || !currentConversationId) return;
    setBillingError('');
    const content = message;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    addMessage(currentConversationId, userMessage);
    setMessage('');
    setIsTyping(true);

    try {
      await runBillableTask({
        model: currentModel,
        category: 'chat',
        estimatedCost: getEstimatedCost('chat', Math.ceil(content.length / 800)),
        description: `独立聊天页 ${currentModel} 回复`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/chat/message', {
            model: currentModel,
            messages: [...(currentConversation?.messages || []), userMessage],
          });
          const assistantMessage: Message = {
            id: result.id || `msg-${Date.now()}`,
            role: 'assistant',
            content: `${result.content || '模型未返回内容。'}\n\n[${result.providerMode === 'upstream' ? '真实上游' : 'Mock兜底'} · ${result.provider || 'mock'} · ${result.upstreamModel || currentModel}]`,
            createdAt: new Date().toISOString(),
          };
          addMessage(currentConversationId, assistantMessage);
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '发送失败');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = async () => {
    const newConv = await createConversation('新对话', currentModel);
    selectConversation(newConv.id);
  };

  const handleTemplateClick = (template: typeof promptTemplates[0]) => {
    setMessage(template.prompt);
  };

  const handleModelChange = async (modelId: string) => {
    setCurrentModel(modelId);
    if (!currentConversationId) {
      const newConv = await createConversation('新对话', modelId);
      selectConversation(newConv.id);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-80 glassmorphism border-r border-primary-600/30 flex flex-col">
        <div className="p-4 border-b border-primary-600/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold gradient-text">AI对话</h2>
            <button
              onClick={handleNewConversation}
              className="p-2 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/40 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                  currentModel === model.id
                    ? 'border-primary-500 bg-primary-600/20'
                    : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                }`}
              >
                <div className="text-xl mb-1">{model.icon}</div>
                <p className="text-sm font-medium text-dark-100">{model.name}</p>
                <p className="text-xs text-dark-400">{model.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-dark-400 mb-3">对话历史</h3>
          {conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all duration-300 ${
                    currentConversationId === conv.id
                      ? 'bg-primary-600/30 border border-primary-500/50'
                      : 'bg-dark-900/30 hover:bg-primary-600/20 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-dark-100 text-sm truncate">{conv.title}</p>
                    <span className="text-xs text-dark-500">{conv.model}</span>
                  </div>
                  <p className="text-xs text-dark-400 mt-1 truncate">
                    {conv.messages.length > 0 ? conv.messages[conv.messages.length - 1].content.substring(0, 50) + '...' : '暂无消息'}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <p className="text-dark-400 text-sm">开始新对话</p>
            </div>
          )}
        </div>

        {conversations.length > 0 && (
          <div className="p-4 border-t border-primary-600/30">
            <button className="w-full py-2 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />
              清空所有对话
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <div className="p-4 glassmorphism border-b border-primary-600/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-dark-100">{currentConversation.title}</h3>
                    <p className="text-xs text-dark-400">{currentConversation.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs text-dark-400">在线</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-accent-500 to-blue-500'
                      : 'bg-gradient-to-br from-primary-600 to-purple-500'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary-600/40 rounded-tr-sm'
                        : 'bg-dark-800/50 rounded-tl-sm'
                    }`}>
                      <p className="text-dark-100 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="text-xs text-dark-500 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-purple-500 flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="inline-block px-4 py-3 rounded-2xl bg-dark-800/50 rounded-tl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 glassmorphism border-t border-primary-600/30">
              {billingError && (
                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {billingError}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {promptTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className="px-3 py-1.5 rounded-lg bg-dark-800/50 text-dark-300 text-sm hover:bg-primary-600/30 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    {template.name}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="输入消息..."
                    className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-primary-600/30 text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 resize-none max-h-32"
                    rows={1}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isTyping}
                  className="p-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white button-glow hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isTyping ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-600/30 to-accent-600/30 flex items-center justify-center mb-8 animate-pulse">
              <MessageSquare className="w-16 h-16 text-dark-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-dark-100 mb-2">开始对话</h2>
            <p className="text-dark-400 mb-8 text-center max-w-md">
              选择一个AI模型并开始与智能助手对话，获取创意灵感和专业知识
            </p>
            <button
              onClick={handleNewConversation}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              创建新对话
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
