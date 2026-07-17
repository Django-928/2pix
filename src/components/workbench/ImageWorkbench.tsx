import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, ZoomIn, X, ImagePlus, ChevronUp, ImageIcon, Proportions, Layers, AlertCircle } from 'lucide-react';
import type { AIModel } from '@/data/models';
import { useStore } from '@/store/useStore';
import { useAccountStore } from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { pollKieTask } from '@/utils/kieTaskPolling';
import { useToast } from '@/components/ui/Toast';
import { ModelLogo, DescriptionCard, SendButton, CostHint } from './shared';

interface ProviderGenerationResponse {
  id: string;
  url?: string;
  content?: string;
  status?: string;
  taskId?: string;
  providerMode?: 'upstream';
  provider?: string;
  upstreamModel?: string;
}

/* ── 对话轮次 ── */
interface ImageTurn {
  id: string;
  prompt: string;
  params: { style?: string; resolution?: string; count?: number; [key: string]: unknown };
  status: 'generating' | 'completed' | 'failed';
  images: string[];
  error?: string;
  taskId?: string;
  progress: number;
  createdAt: number;
}

/* ── 生成中的进度卡片（AI侧） ── */
function GeneratingCard({ progress, count }: { progress: number; count: number }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-[#a78bfa]">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 rounded-full border border-[#8b5cf6]/30" />
          <div className="absolute inset-0 rounded-full border border-t-[#8b5cf6] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <span>正在生成{count > 1 ? ` ${count} 张图片` : '图片'}...</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-linear bg-gradient-to-r from-purple-500 to-indigo-500"
          style={{ width: `${Math.max(5, progress)}%` }}
        />
      </div>
      <p className="text-[10px] text-[#52525b]">{Math.round(progress)}%</p>
    </div>
  );
}

/* ── 失败卡片（AI侧） ── */
function FailedCard({ error }: { error: string }) {
  return (
    <div className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] p-4 flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-red-300 leading-relaxed">{error}</p>
    </div>
  );
}

/* ── 图片网格（AI侧） ── */
function ImageGrid({
  images,
  onPreview,
  onDownload,
}: {
  images: string[];
  onPreview: (url: string) => void;
  onDownload: (url: string, index: number) => void;
}) {
  return (
    <div className={`grid gap-2.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {images.map((img, i) => (
        <div
          key={i}
          className="group relative rounded-xl overflow-hidden border border-white/[0.08] bg-[var(--bg-card,#1c1c1e)] cursor-pointer"
          onClick={() => onPreview(img)}
        >
          <img src={img} alt={`生成结果 ${i + 1}`} className="w-full h-auto object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(img); }}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(img, i); }}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
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

/* ─────────────── 风格标签 ─────────────── */
const STYLE_TAGS = ['写实', '动漫', '油画', '水墨', '赛博朋克', '像素风', '3D渲染', '极简'];

/* ─────────────── 比例选项 ─────────────── */
const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', icon: '□' },
  { label: '9:16', value: '9:16', icon: '▯' },
  { label: '16:9', value: '16:9', icon: '▭' },
  { label: '4:3', value: '4:3', icon: '▭' },
  { label: '3:2', value: '3:2', icon: '▭' },
];

/* ─────────────── 参数标签 ─────────────── */
function ParamTags({ style, ratio, count }: { style: string; ratio: string; count: number }) {
  const tags = [style, `${ratio}`, `${count}张`];
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      {tags.map((tag) => (
        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-[#71717a]">
          {tag}
        </span>
      ))}
    </div>
  );
}

/* ─────────────── 图片工作台 ─────────────── */
export default function ImageWorkbench({ model }: { model: AIModel }) {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [billingError, setBillingError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('写实');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImagesState, setNumImagesState] = useState(1);
  const [activeTab, setActiveTab] = useState<'style' | 'ratio' | 'count' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [turns, setTurns] = useState<ImageTurn[]>([]);

  const { loadProjects } = useStore();
  const { refreshBalance } = useAccountStore();
  const toast = useToast();

  const isGenerating = turns.some((t) => t.status === 'generating');

  const aspectRatioToSize: Record<string, string> = {
    '1:1': '1024x1024',
    '9:16': '768x1360',
    '16:9': '1360x768',
    '4:3': '1024x768',
    '3:2': '1152x768',
  };

  const size = aspectRatioToSize[aspectRatio] || '1024x1024';
  const numImages = numImagesState;

  /* 自动滚到底部 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (referenceImages.length >= 10) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setReferenceImages((prev) => (prev.length < 10 ? [...prev, result] : prev));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveRef = (idx: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== idx));
  };

  /** 更新某个 turn 的字段 */
  const updateTurn = useCallback((turnId: string, patch: Partial<ImageTurn>) => {
    setTurns((prev) =>
      prev.map((t) => (t.id === turnId ? { ...t, ...patch } : t)),
    );
  }, []);

  /** 轮询单个 KIE 任务并更新对应 turn */
  const pollAndResolveTask = useCallback(async (taskId: string, turnId: string) => {
    let resolved = false;
    const result = await pollKieTask(taskId, {
      maxAttempts: 60,
      intervalMs: 3000,
      onProgress: (percent) => {
        updateTurn(turnId, { progress: percent });
      },
    });

    if (result?.url) {
      resolved = true;
      setTurns((prev) =>
        prev.map((t) => {
          if (t.id !== turnId) return t;
          const newImages = [...t.images];
          // 找到空位填入，或追加
          const emptyIdx = newImages.indexOf('');
          if (emptyIdx >= 0) {
            newImages[emptyIdx] = result.url!;
          } else {
            newImages.push(result.url!);
          }
          // 检查是否所有图片都已生成
          const allDone = newImages.every((img) => img !== '');
          return {
            ...t,
            images: newImages,
            status: allDone ? 'completed' : 'generating',
            progress: allDone ? 100 : t.progress,
            taskId: allDone ? undefined : t.taskId,
          };
        }),
      );
    }

    if (!resolved) {
      const reason = result?.status === 'Failed' ? '任务失败' : '轮询超时';
      updateTurn(turnId, { status: 'failed', error: reason });
      toast.error(`图片生成${reason}，请重试`);
    }
  }, [updateTurn, toast]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setBillingError('');
    setActiveTab(null);

    const turnId = `turn-${Date.now()}`;
    const newTurn: ImageTurn = {
      id: turnId,
      prompt: prompt.trim(),
      params: { style: selectedStyle, resolution: size, count: numImages },
      status: 'generating',
      images: [],
      progress: 0,
      createdAt: Date.now(),
    };
    setTurns((prev) => [...prev, newTurn]);

    try {
      await runBillableTask({
        model: model.id,
        category: 'image',
        estimatedCost: await getEstimatedCost('image', numImages),
        description: `${model.name} 图片生成 ${numImages} 张`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const results = await Promise.all(
            Array.from({ length: numImages }, (_, i) =>
              api.post<ProviderGenerationResponse>('/image/generate', {
                prompt: prompt.trim(),
                model: model.id,
                style: selectedStyle,
                resolution: size,
                seed: Date.now() + i,
                ...(referenceImages.length > 0 ? { referenceImages } : {}),
              }),
            ),
          );

          // 分类：有 url 的直接填入，有 taskId 的需要轮询
          const directImages: string[] = [];
          const pollingEntries: { taskId: string }[] = [];

          results.forEach((item) => {
            if (item.url) {
              directImages.push(item.url);
            } else if (item.taskId) {
              directImages.push(''); // 占位
              pollingEntries.push({ taskId: item.taskId });
            }
          });

          // 如果有直接结果，更新 turn
          const hasDirect = directImages.some((img) => img !== '');
          const hasPolling = pollingEntries.length > 0;

          if (hasDirect && !hasPolling) {
            // 全部直接返回
            updateTurn(turnId, {
              images: directImages,
              status: 'completed',
              progress: 100,
            });
          } else if (hasPolling) {
            // 有需要轮询的任务
            updateTurn(turnId, {
              images: directImages,
              progress: 10,
            });
            // 异步轮询
            pollingEntries.forEach((entry) => {
              pollAndResolveTask(entry.taskId, turnId);
            });
          } else {
            // 既没有 url 也没有 taskId
            updateTurn(turnId, {
              status: 'failed',
              error: '未返回图片地址或任务ID，请检查模型配置',
            });
          }

          loadProjects();
        },
      });
    } catch (error) {
      updateTurn(turnId, {
        status: 'failed',
        error: error instanceof Error ? error.message : '生成失败',
      });
      setBillingError(error instanceof Error ? error.message : '生成失败');
    }
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `generated-${model.id}-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const samplePrompts = [
    '一只穿着宇航服的猫咪在月球表面行走，赛博朋克风格，霓虹灯光',
    '未来城市夜景，rain-soaked streets，电影级画质，冷色调',
    '古风仕女图，水墨风格，淡雅色调，留白构图，东方美学',
    '精致的日式庭院，樱花飘落，午后阳光，写实摄影风格',
  ];

  const isEmpty = turns.length === 0 && !isGenerating;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-workbench, #0a0a0a)' }}>
      {/* ── 空状态（无对话时显示模型描述 + 快捷提示词） ── */}
      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#6366f1]/10 border border-[#8b5cf6]/20 flex items-center justify-center shadow-2xl shadow-[#8b5cf6]/10">
            <ModelLogo model={model} />
          </div>
          <div className="mt-5">
            <DescriptionCard model={model} />
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
            {samplePrompts.map((text, i) => (
              <PromptCard key={i} text={text} onClick={() => setPrompt(text)} />
            ))}
          </div>
        </div>
      )}

      {/* ── 对话流区域（可滚动） ── */}
      {!isEmpty && (
        <div className="flex-shrink-0 max-h-[48px] px-4 pt-3 pb-1">
          <DescriptionCard model={model} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            {/* 用户 prompt 气泡 - 靠右 */}
            <div className="flex justify-end">
              <div className="max-w-[80%]">
                <div className="bg-white/[0.06] rounded-2xl rounded-br-md px-4 py-3">
                  <p className="text-sm text-[#e4e4e7] leading-relaxed whitespace-pre-wrap">{turn.prompt}</p>
                </div>
                <ParamTags
                  style={turn.params.style as string || selectedStyle}
                  ratio={(turn.params.resolution as string || size).includes('x') ? aspectRatio : (turn.params.resolution as string || size)}
                  count={(turn.params.count as number) || numImages}
                />
              </div>
            </div>

            {/* AI 响应区域 - 靠左 */}
            <div className="flex justify-start">
              <div className="max-w-[85%] space-y-2.5">
                {turn.status === 'generating' && (
                  <GeneratingCard
                    progress={turn.progress}
                    count={(turn.params.count as number) || numImages}
                  />
                )}

                {turn.status === 'failed' && (
                  <FailedCard error={turn.error || '生成失败'} />
                )}

                {turn.status === 'completed' && turn.images.length > 0 && (
                  <ImageGrid
                    images={turn.images}
                    onPreview={setPreviewImage}
                    onDownload={handleDownload}
                  />
                )}

                {/* 时间戳 */}
                <p className="text-[10px] text-[#3f3f46]">
                  {new Date(turn.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ── 底部操作区 ── */}
      <div className="p-4">
        {billingError && (
          <div className="max-w-3xl mx-auto mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {billingError}
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-3">
          {/* 输入框容器 */}
          <div className="relative rounded-2xl bg-[var(--bg-card,#1c1c1e)] border border-white/[0.08] p-4 shadow-lg">
            {/* 参考图上传行 */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto">
              {referenceImages.map((img, i) => (
                <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/[0.08] flex-shrink-0 group">
                  <img src={img} alt="参考图" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveRef(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#333] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {referenceImages.length < 10 && (
                <button
                  onClick={handleUpload}
                  className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/[0.03] border border-white/[0.08] border-dashed flex items-center justify-center text-[#71717a] hover:text-[#a1a1aa] hover:bg-white/[0.06] transition-all"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-[11px] text-[#52525b] flex-shrink-0">参考图 {referenceImages.length}/10</span>
            </div>

            {/* 文本输入 */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述画面中的物体、风格及文字排版，注重指令精准与细节还原。"
              className="w-full bg-transparent text-[#e4e4e7] placeholder-[#52525b] text-sm resize-none outline-none min-h-[48px] max-h-[120px]"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />

            {/* 参数弹出面板 */}
            {activeTab && (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                {activeTab === 'style' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {STYLE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedStyle(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                          selectedStyle === tag
                            ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                            : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab === 'ratio' && (
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all border ${
                          aspectRatio === ratio.value
                            ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                            : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06]'
                        }`}
                      >
                        <Proportions className="w-3.5 h-3.5" />
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab === 'count' && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumImagesState(n)}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs transition-all border ${
                          numImagesState === n
                            ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                            : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06]'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                        {n}张
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 底部工具栏 */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-1">
                {/* 风格标签按钮 */}
                <button
                  onClick={() => setActiveTab(activeTab === 'style' ? null : 'style')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    activeTab === 'style'
                      ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                      : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {selectedStyle}
                  <ChevronUp className={`w-3 h-3 transition-transform ${activeTab === 'style' ? 'rotate-180' : ''}`} />
                </button>

                {/* 比例标签按钮 */}
                <button
                  onClick={() => setActiveTab(activeTab === 'ratio' ? null : 'ratio')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    activeTab === 'ratio'
                      ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                      : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                  }`}
                >
                  <Proportions className="w-3.5 h-3.5" />
                  {aspectRatio}
                  <ChevronUp className={`w-3 h-3 transition-transform ${activeTab === 'ratio' ? 'rotate-180' : ''}`} />
                </button>

                {/* 数量标签按钮 */}
                <button
                  onClick={() => setActiveTab(activeTab === 'count' ? null : 'count')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    activeTab === 'count'
                      ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                      : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {numImagesState}张
                  <ChevronUp className={`w-3 h-3 transition-transform ${activeTab === 'count' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <CostHint text="0.07~0.22/次" />
                <SendButton onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} loading={isGenerating} text="生成" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 图片预览 Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={previewImage}
              alt="预览"
              className="max-w-full max-h-[85vh] rounded-xl border border-white/[0.08] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#333] border border-white/[0.1] text-white flex items-center justify-center hover:bg-[#444] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(previewImage, 0);
              }}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#333]/80 backdrop-blur-sm border border-white/[0.1] text-white text-xs flex items-center gap-1.5 hover:bg-[#444]/80 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              下载
            </button>
          </div>
        </div>
      )}
    </div>
  );
}