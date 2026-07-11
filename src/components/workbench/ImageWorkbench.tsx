import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, Download, ZoomIn, X, ImagePlus, Wand2, ChevronUp, ImageIcon, RatioIcon, Layers, AlertCircle } from 'lucide-react';
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
  providerMode?: 'upstream' | 'mock';
  provider?: string;
  upstreamModel?: string;
}

/* ── 轮询中的占位卡片 ── */
function PollingImageCard({ progress }: { progress: number }) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#8b5cf6]/20 bg-[var(--bg-card,#1c1c1e)] flex flex-col items-center justify-center aspect-square">
      {/* 脉冲动画背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/10 to-[#6366f1]/5 animate-pulse" />
      {/* 旋转 spinner */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[#8b5cf6] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <Wand2 className="absolute inset-0 m-auto w-5 h-5 text-[#8b5cf6]" />
      </div>
      <p className="relative mt-3 text-xs text-[#a78bfa]">生成中...</p>
      {/* 进度条 */}
      <div className="relative mt-2 w-32 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
          }}
        />
      </div>
      <p className="relative mt-1 text-[10px] text-[#52525b]">{progress}%</p>
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

/* ─────────────── 图片工作台 ─────────────── */
export default function ImageWorkbench({ model }: { model: AIModel }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [billingError, setBillingError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('写实');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImagesState, setNumImagesState] = useState(1);
  const [activeTab, setActiveTab] = useState<'style' | 'ratio' | 'count' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [pollingProgress, setPollingProgress] = useState<Record<string, number>>({});

  const { addProject } = useStore();
  const { refreshBalance } = useAccountStore();
  const toast = useToast();

  const aspectRatioToSize: Record<string, string> = {
    '1:1': '1024x1024',
    '9:16': '768x1360',
    '16:9': '1360x768',
    '4:3': '1024x768',
    '3:2': '1152x768',
  };

  const size = aspectRatioToSize[aspectRatio] || '1024x1024';
  const numImages = numImagesState;

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

  /** 轮询单个 KIE 任务并更新图片列表 */
  const pollAndResolveTask = useCallback(async (taskId: string, index: number) => {
    const slotKey = `slot-${index}`;
    const result = await pollKieTask(taskId, {
      maxAttempts: 60,
      intervalMs: 3000,
      onProgress: (percent) => {
        setPollingProgress((prev) => ({ ...prev, [slotKey]: percent }));
      },
    });

    // 轮询完成，从 pending 中移除
    setPendingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setPollingProgress((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });

    if (result?.url) {
      setGeneratedImages((prev) => {
        const next = [...prev];
        if (next.length > index) {
          next[index] = result.url!;
        } else {
          next.push(result.url!);
        }
        return next;
      });
    } else {
      const reason = result?.status === 'Failed' ? '任务失败' : '轮询超时';
      toast.error(`图片 ${index + 1} ${reason}，请重试`);
      setBillingError(`图片 ${index + 1} ${reason}`);
    }
  }, [toast]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setBillingError('');
    setIsGenerating(true);
    try {
      await runBillableTask({
        model: model.id,
        category: 'image',
        estimatedCost: getEstimatedCost('image', numImages),
        description: `${model.name} 图片生成 ${numImages} 张`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const results = await Promise.all(
            Array.from({ length: numImages }, (_, i) =>
              api.post<ProviderGenerationResponse>('/image/generate', {
                prompt,
                model: model.id,
                style: selectedStyle,
                resolution: size,
                seed: Date.now() + i,
              }),
            ),
          );

          const first = results[0];

          // 分类：有 url 的直接展示，只有 taskId 的需要前端轮询
          const directImages: string[] = [];
          const pollingEntries: { taskId: string; index: number }[] = [];

          results.forEach((item, i) => {
            if (item.url) {
              directImages.push(item.url);
            } else if (item.taskId) {
              directImages.push(''); // 占位
              pollingEntries.push({ taskId: item.taskId, index: i });
            }
          });

          setGeneratedImages(directImages);

          // 启动需要轮询的任务
          const newPending = new Set(pollingEntries.map((e) => e.taskId));
          setPendingTaskIds((prev) => {
            const next = new Set(prev);
            pollingEntries.forEach((e) => next.add(e.taskId));
            return next;
          });

          // 异步轮询（不阻塞 run 的完成）
          pollingEntries.forEach((entry) => {
            pollAndResolveTask(entry.taskId, entry.index);
          });

          addProject({
            id: `proj-${Date.now()}`,
            name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
            type: 'image',
            status: 'complete',
            inputParams: { prompt, size, style: selectedStyle, numImages },
            createdAt: new Date().toISOString(),
          });
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-workbench, #0a0a0a)' }}>
      {/* ── 空状态 ── */}
      {generatedImages.length === 0 && !isGenerating && (
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

      {/* ── 生成结果 ── */}
      {(generatedImages.length > 0 || isGenerating) && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className={`grid gap-3 max-w-3xl mx-auto ${generatedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>

            {/* Loading 占位 */}
            {isGenerating && generatedImages.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#8b5cf6] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#8b5cf6]" />
                </div>
                <p className="mt-4 text-sm text-[#71717a]">正在生成画面，请稍候…</p>
              </div>
            )}

            {generatedImages.map((img, i) => {
              // 空字符串表示正在轮询中，显示占位卡片
              if (!img) {
                return <PollingImageCard key={`polling-${i}`} progress={pollingProgress[`slot-${i}`] ?? 0} />;
              }
              return (
                <div
                  key={i}
                  className="group relative rounded-xl overflow-hidden border border-white/[0.08] bg-[var(--bg-card,#1c1c1e)] cursor-pointer"
                  onClick={() => setPreviewImage(img)}
                >
                  <img src={img} alt={`生成结果 ${i + 1}`} className="w-full h-auto object-cover" />
                  {/* 悬停操作层 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(img);
                      }}
                      className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img, i);
                      }}
                      className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                        <RatioIcon className="w-3.5 h-3.5" />
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
                  <RatioIcon className="w-3.5 h-3.5" />
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
                const idx = generatedImages.indexOf(previewImage);
                handleDownload(previewImage, idx >= 0 ? idx : 0);
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
