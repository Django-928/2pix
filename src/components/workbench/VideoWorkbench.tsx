import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Play,
  X,
  Upload,
  Film,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { AIModel } from '@/data/models';
import { useStore } from '@/store/useStore';
import { useAccountStore } from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { pollKieTask } from '@/utils/kieTaskPolling';
import { useToast } from '@/components/ui/Toast';
import { ModelLogo, DescriptionCard, ParamCapsule, SendButton, CostHint } from './shared';

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

/* ── 生成视频条目 ── */
interface VideoItem {
  id: string;
  url: string;
  duration: string;
  resolution: string;
  aspectRatio: string;
  thumbnail?: string;
}

/* ─────────────── 快捷提示词卡片 ─────────────── */
function PromptCard({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 rounded-2xl text-left group transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)';
        e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
    >
      <p className="text-sm text-[#c0c0c6] group-hover:text-white transition-colors line-clamp-2">{text}</p>
    </button>
  );
}

/* ─────────────── 单个视频卡片 ─────────────── */
function VideoCard({
  item,
  index,
}: {
  item: VideoItem;
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `video-${item.id}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(item.url, '_blank');
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden group"
      style={{
        background: 'var(--bg-card, #1c1c1e)',
        border: '1px solid rgba(255,255,255,0.08)',
        aspectRatio: item.aspectRatio === '9:16' ? '9/16' : item.aspectRatio === '1:1' ? '1/1' : '16/9',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={item.url}
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
      />

      {/* 播放按钮遮罩 */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              boxShadow: '0 0 24px rgba(139,92,246,0.4)',
            }}
          >
            <Play className="w-5 h-5 text-white ml-0.5" />
          </button>
        </div>
      )}

      {/* 暂停按钮 */}
      {isPlaying && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: 'rgba(139,92,246,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <span className="w-4 h-4 bg-white rounded-sm" style={{ margin: '0 2px' }} />
          </button>
        </div>
      )}

      {/* 底部信息条 */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between transition-opacity"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          opacity: isHovered ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 text-xs text-white/80">
          <Film className="w-3 h-3" />
          <span>{item.resolution}</span>
          <span className="text-white/40">|</span>
          <Clock className="w-3 h-3" />
          <span>{item.duration}s</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        >
          <Download className="w-3 h-3" />
          下载
        </button>
      </div>

      {/* 视频编号 */}
      <div
        className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      >
        {index + 1}
      </div>
    </div>
  );
}

/* ─────────────── 视频工作台 ─────────────── */
export default function VideoWorkbench({ model }: { model: AIModel }) {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState('5');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [cameraMove, setCameraMove] = useState('固定');
  const numVideos = 1;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [billingError, setBillingError] = useState('');
  const [providerInfo, setProviderInfo] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<VideoItem[]>([]);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addProject = useStore((s) => s.addProject);
  const refreshBalance = useAccountStore((s) => s.refreshBalance);
  const toast = useToast();

  const samplePrompts = [
    '一个宇航员在火星上跳舞，红色沙丘背景，电影级运镜',
    '赛博朋克城市雨夜，霓虹灯光反射在湿漉漉的街道上',
    '古风仙侠场景，白衣剑客在竹林中飞舞，慢动作',
    '微观世界，一滴水滴落入水面，超高速摄影',
  ];

  const maxReferences = 5;

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setReferenceImages((prev) => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setBillingError('');
    setIsGenerating(true);
    setProgress(0);

    // 匀速进度条：从 0 匀速增长到 95%（等待后端响应或轮询完成）
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        // 每次增长约 2%，模拟匀速（800ms 间隔 * ~2% ≈ 95% 需要 ~38s）
        return Math.min(prev + 2, 95);
      });
    }, 800);

    try {
      await runBillableTask({
        model: model.id,
        category: 'video',
        estimatedCost: getEstimatedCost('video', numVideos, Number(duration) || 5),
        description: `${model.name} 视频生成 ${duration} 秒`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/video/generate', {
            prompt,
            model: model.id,
            resolution,
            duration,
            aspectRatio,
          });
          setProviderInfo(
            `${result.providerMode === 'upstream' ? '真实上游' : 'Mock兜底'} · ${result.provider || 'mock'} · ${result.upstreamModel || model.id}`,
          );

          // 情况1：后端返回了真实 URL → 直接使用
          if (result.url) {
            setGeneratedVideo(result.url);
            const newVideoItem: VideoItem = {
              id: `vid-${Date.now()}`,
              url: result.url,
              duration,
              resolution,
              aspectRatio,
            };
            setGeneratedVideos((prev) => [newVideoItem, ...prev]);
          } else if (result.taskId) {
            // 情况2：后端轮询超时，只有 taskId → 前端自行轮询
            // 先不停止 progressTimer，让匀速进度条继续运行
            const pollResult = await pollKieTask(result.taskId, {
              maxAttempts: 60,
              intervalMs: 3000,
              onProgress: (percent) => {
                // 轮询进度覆盖匀速进度
                setProgress(percent);
              },
            });

            if (pollResult?.url) {
              const videoUrl = pollResult.url;
              setGeneratedVideo(videoUrl);
              const newVideoItem: VideoItem = {
                id: `vid-${Date.now()}`,
                url: videoUrl,
                duration,
                resolution,
                aspectRatio,
              };
              setGeneratedVideos((prev) => [newVideoItem, ...prev]);
            } else {
              const reason = pollResult?.status === 'Failed' ? '任务失败' : '轮询超时';
              toast.error(`视频${reason}，请重试`);
              setBillingError(`视频${reason}，请重试`);
            }
          } else {
            // 情况3：既没有 URL 也没有 taskId（mock 模式下的 fallback）
            const videoUrl = `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4?t=${Date.now()}`;
            setGeneratedVideo(videoUrl);
            const newVideoItem: VideoItem = {
              id: `vid-${Date.now()}`,
              url: videoUrl,
              duration,
              resolution,
              aspectRatio,
            };
            setGeneratedVideos((prev) => [newVideoItem, ...prev]);
          }

          addProject({
            id: `proj-${Date.now()}`,
            name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
            type: 'video',
            status: 'complete',
            inputParams: { prompt, resolution, duration, aspectRatio, numVideos, cameraMove },
            createdAt: new Date().toISOString(),
          });
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '生成失败');
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(100);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedVideo) return;
    try {
      const response = await fetch(generatedVideo);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `generated-video-${model.id}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(generatedVideo, '_blank');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [generatedVideo]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-workbench, #0a0a0a)' }}>
      {/* ═══════ 空状态 ═══════ */}
      {!generatedVideo && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* 模型 Logo */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 0 40px rgba(139,92,246,0.12)',
            }}
          >
            <ModelLogo model={model} />
          </div>

          {/* 描述卡片 */}
          <div className="mt-6">
            <DescriptionCard model={model} />
          </div>

          {/* 快捷提示词 */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
            {samplePrompts.map((text, i) => (
              <PromptCard key={i} text={text} onClick={() => setPrompt(text)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════ 生成中 Loading ═══════ */}
      {isGenerating && !generatedVideo && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* 旋转动画 */}
          <div className="relative w-20 h-20">
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(139,92,246,0.15)' }}
            />
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                border: '2px solid transparent',
                borderTopColor: '#8b5cf6',
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
              }}
            />
            <Film
              className="absolute inset-0 m-auto w-7 h-7"
              style={{ color: '#8b5cf6' }}
            />
          </div>
          <p className="mt-5 text-sm" style={{ color: '#71717a' }}>
            正在生成视频，请稍候...
          </p>
          {/* 进度条 */}
          <div
            className="mt-4 w-56 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
              }}
            />
          </div>
          <p className="mt-2 text-xs" style={{ color: '#52525b' }}>
            {Math.round(Math.min(progress, 100))}%
          </p>
        </div>
      )}

      {/* ═══════ 生成结果 - 视频网格 ═══════ */}
      {generatedVideos.length > 0 && !isGenerating && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* 来源信息 */}
            {providerInfo && (
              <div
                className="rounded-xl px-3 py-2 text-xs"
                style={{
                  color: '#888',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                生成来源：{providerInfo}
              </div>
            )}

            {/* 视频网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generatedVideos.map((item, i) => (
                <VideoCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 底部操作区（即梦风格） ═══════ */}
      <div className="p-4">
        {/* 错误提示 */}
        {billingError && (
          <div
            className="max-w-3xl mx-auto mb-3 px-3 py-2 rounded-xl text-xs"
            style={{
              color: '#fca5a5',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {billingError}
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-3">
          {/* 输入框容器（大圆角） */}
          <div
            className="relative rounded-2xl p-4"
            style={{
              background: 'var(--bg-card, #1c1c1e)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* 参考素材上传行 */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {referenceImages.map((img, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 rounded-lg overflow-hidden group"
                  style={{
                    width: '48px',
                    height: '48px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <img src={img} alt="参考素材" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setReferenceImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#ef4444' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {referenceImages.length < maxReferences && (
                <button
                  onClick={handleUpload}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 transition-all"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    color: '#71717a',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                    e.currentTarget.style.color = '#a78bfa';
                    e.currentTarget.style.background = 'rgba(139,92,246,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#71717a';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] flex-shrink-0" style={{ color: '#52525b' }}>
                参考素材 ({referenceImages.length}/{maxReferences})
              </span>
            </div>

            {/* 文本输入（占满宽度） */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要的视频画面，包括场景、人物、动作、运镜、氛围..."
              className="w-full bg-transparent text-sm resize-none outline-none min-h-[48px] max-h-[120px]"
              style={{
                color: '#e4e4e7',
              }}
              rows={2}
            />

            {/* 参数行 + 生成按钮 */}
            <div
              className="flex items-center justify-between mt-3 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                {/* 画质 */}
                <ParamCapsule
                  label="画质"
                  value={resolution}
                  options={['480p', '720p', '1080p']}
                  onChange={setResolution}
                />
                {/* 时长 */}
                <ParamCapsule
                  label="时长"
                  value={`${duration}秒`}
                  options={['5秒', '10秒', '15秒']}
                  onChange={(v) => setDuration(v.replace('秒', ''))}
                />
                {/* 比例 */}
                <ParamCapsule
                  label="比例"
                  value={aspectRatio}
                  options={['16:9', '9:16', '1:1']}
                  onChange={setAspectRatio}
                />
              </div>

              <div className="flex items-center gap-3">
                <CostHint
                  text={`预计 ${getEstimatedCost('video', numVideos, Number(duration) || 5).toFixed(4)}/秒`}
                />
                <SendButton
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  loading={isGenerating}
                  text="生成"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
