import { useState, useRef, useEffect } from 'react';
import {
  Download,
  Play,
  Pause,
  Music,
  Mic,
  Guitar,
  Drum,
  Piano,
  Headphones,
} from 'lucide-react';
import type { AIModel } from '@/data/models';
import { useStore } from '@/store/useStore';
import { useAccountStore } from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';
import { useMediaEvents } from '@/hooks/useMediaEvents';
import { ModelLogo, DescriptionCard, SendButton, CostHint } from './shared';

/* ── 类型定义 ── */
interface ProviderGenerationResponse {
  id: string;
  url?: string;
  content?: string;
  status?: string;
  providerMode?: 'upstream' | 'mock';
  provider?: string;
  upstreamModel?: string;
}

interface MusicTrack {
  id: string;
  title: string;
  duration: string;
  durationSec: number;
  gradient: string;
  providerInfo: string;
}

/* ── 乐器标签 ── */
const INSTRUMENT_TAGS = [
  { label: 'Piano', icon: Piano },
  { label: 'Guitar', icon: Guitar },
  { label: 'Drums', icon: Drum },
  { label: 'Strings', icon: Music },
  { label: 'Electronic', icon: Headphones },
  { label: 'Vocals', icon: Mic },
];

/* ── 时长选项 ── */
const DURATION_OPTIONS = [
  { label: '30s', value: '30s', sec: 30 },
  { label: '60s', value: '60s', sec: 60 },
  { label: '120s', value: '120s', sec: 120 },
  { label: '180s', value: '180s', sec: 180 },
];

/* ── 版本选项 ── */
const VERSION_OPTIONS = ['v1', 'v2'];

/* ── 快捷提示词 ── */
const QUICK_PROMPTS = [
  '轻快的爵士乐',
  '深夜电子氛围',
  '古风琵琶配器',
  '电影级史诗配乐',
];

/* ══════════════════════════════════════════════════════════════════
   子组件
   ══════════════════════════════════════════════════════════════════ */

/* ── 波形动画加载 ── */
function WaveformLoader() {
  return (
    <div className="flex items-center justify-center gap-[3px] py-8">
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: 'linear-gradient(to top, #8b5cf6, #a78bfa)',
            animation: `audioWave 1.2s ease-in-out ${i * 0.05}s infinite`,
            height: '12px',
          }}
        />
      ))}
      <style>{`
        @keyframes audioWave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── 快捷提示词卡片 ── */
function PromptCard({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#8b5cf6]/30 hover:bg-[rgba(139,92,246,0.08)] transition-all text-left group"
    >
      <p className="text-sm text-[#c0c0c6] group-hover:text-white transition-colors line-clamp-2">
        {text}
      </p>
    </button>
  );
}

/* ── 音乐卡片 ── */
function MusicCard({
  track,
  isPlaying,
  onTogglePlay,
}: {
  track: MusicTrack;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#1a1a1a] border border-white/[0.08] overflow-hidden group hover:border-[#8b5cf6]/30 transition-all">
      {/* 渐变封面 */}
      <div
        className="relative h-40 flex items-center justify-center"
        style={{ background: track.gradient }}
      >
        <Music className="w-14 h-14 text-white/50" />
        {/* 播放按钮叠层 */}
        <button
          onClick={onTogglePlay}
          className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm flex items-center justify-center hover:bg-[#1a1a1a] transition-all shadow-lg group-hover:scale-105"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>
      </div>

      {/* 信息区 */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[#e5e5e5] truncate">{track.title}</h4>
          <span className="text-xs text-[#666] flex-shrink-0 ml-2">{track.duration}</span>
        </div>

        {/* 进度条 */}
        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: isPlaying ? `${30 + Math.random() * 40}%` : '0%',
              background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
            }}
          />
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[#555]">
            {isPlaying ? `${Math.floor(track.durationSec * 0.3 / 60)}:${String(Math.floor(track.durationSec * 0.3) % 60).padStart(2, '0')} / ${Math.floor(track.durationSec / 60)}:${String(track.durationSec % 60).padStart(2, '0')}` : `0:00 / ${Math.floor(track.durationSec / 60)}:${String(track.durationSec % 60).padStart(2, '0')}`}
          </span>
          <button className="p-1.5 rounded-lg text-[#666] hover:text-[#a78bfa] hover:bg-white/[0.05] transition-all">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   主组件
   ══════════════════════════════════════════════════════════════════ */
export default function AudioWorkbench({ model }: { model: AIModel }) {
  /* ── 核心业务 state（保留原有逻辑） ── */
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [billingError, setBillingError] = useState('');
  const speed = '1.0x';
  const quality = '标准';
  const emotion = '自动';
  const numAudio = 1;

  /* ── 新增 UI state ── */
  const [activeTab, setActiveTab] = useState<'custom' | 'describe'>('describe');
  const [lyrics, setLyrics] = useState('');
  const [styleText, setStyleText] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [audioDuration, setAudioDuration] = useState('60s');
  const [version, setVersion] = useState('v2');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const addProject = useStore((s) => s.addProject);
  const refreshBalance = useAccountStore((s) => s.refreshBalance);

  /* ── 生成时长秒数 ── */
  const durationSec = DURATION_OPTIONS.find((d) => d.value === audioDuration)?.sec ?? 60;

  /* ── 渐变列表 ── */
  const gradients = [
    'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
  ];

  /* ── 乐器标签切换 ── */
  const toggleInstrument = (tag: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  /* ── 原有 API 调用逻辑（完整保留） ── */
  const handleGenerate = async () => {
    if (!text.trim()) return;
    setBillingError('');
    setIsGenerating(true);
    try {
      await runBillableTask({
        model: model.id,
        category: 'audio',
        estimatedCost: await getEstimatedCost('audio', numAudio),
        description: `${model.name} 音频生成`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/audio/speech', {
            text,
            model: model.id,
            voice: emotion,
            language: 'zh',
          });
          const newTrack: MusicTrack = {
            id: `track-${Date.now()}`,
            title: text.substring(0, 20),
            duration: audioDuration,
            durationSec,
            gradient: gradients[tracks.length % gradients.length],
            providerInfo: '',
          };

          setTracks((prev) => [...prev, newTrack]);
          setGenerated(true);

          addProject({
            id: `proj-${Date.now()}`,
            name: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            type: 'audio',
            status: 'complete',
            inputParams: {
              text,
              model: model.name,
              speed,
              quality,
              emotion,
              style: styleText,
              instruments: selectedInstruments,
              lyrics,
              duration: audioDuration,
              version,
            },
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

  /* ── 播放切换 ── */
  const togglePlay = (trackId: string) => {
    if (playingTrackId === trackId) {
      setIsPlaying(false);
      setPlayingTrackId(null);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPlayingTrackId(trackId);
      setIsPlaying(true);
    }
  };

  /* ── audio 事件绑定 ── */
  useMediaEvents(audioRef, setIsPlaying, () => setPlayingTrackId(null));

  /* ── 生成按钮是否可用 ── */
  const canGenerate =
    activeTab === 'custom' ? lyrics.trim().length >= 10 : text.trim().length > 0;

  /* ══════════════════════════════════════════════════════════════
     渲染
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 隐藏 audio 元素（预留真实音频播放） */}
      <audio ref={audioRef} preload="metadata" />

      {/* ═══════ 空状态：Logo + DescriptionCard + 2x2 快捷提示词 ═══════ */}
      {tracks.length === 0 && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
          {/* 模型 Logo */}
          <div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b5cf6]/20 to-[#6366f1]/10 border border-[#8b5cf6]/20 flex items-center justify-center mb-6 shadow-2xl shadow-[#8b5cf6]/10"
          >
            <ModelLogo model={model} />
          </div>

          {/* DescriptionCard */}
          <div className="w-full">
            <DescriptionCard model={model} />
          </div>

          {/* 2x2 快捷提示词 */}
          <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-lg">
            {QUICK_PROMPTS.map((prompt) => (
              <PromptCard
                key={prompt}
                text={prompt}
                onClick={() => setText(prompt)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════ 生成中：波形动画 ═══════ */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="rounded-2xl bg-[#1a1a1a] border border-[#8b5cf6]/20 p-8 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center animate-pulse shadow-lg shadow-purple-500/30">
                <Music className="w-7 h-7 text-white" />
              </div>
            </div>
            <p className="text-center text-sm text-[#a78bfa] mb-2">正在创作中...</p>
            <WaveformLoader />
            <p className="text-center text-xs text-[#555] mt-4">预计需要 30-60 秒</p>
          </div>
        </div>
      )}

      {/* ═══════ 生成结果区：歌曲卡片列表 ═══════ */}
      {tracks.length > 0 && !isGenerating && (
        <div className="flex-1 px-4 pt-2 pb-2 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {tracks.map((track) => (
              <MusicCard
                key={track.id}
                track={track}
                isPlaying={playingTrackId === track.id && isPlaying}
                onTogglePlay={() => togglePlay(track.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════ 底部创作区（Suno 风格核心） ═══════ */}
      <div className="p-4">
        {/* 错误提示 */}
        {billingError && (
          <div className="max-w-3xl mx-auto mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            {billingError}
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl p-4 shadow-lg"
            style={{
              background: 'var(--bg-card, #1c1c1e)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* ── Tab 切换：自定义模式 / 简单模式 ── */}
            <div className="flex items-center gap-1 mb-4 p-1 rounded-xl bg-white/[0.04] w-fit">
              <button
                onClick={() => setActiveTab('describe')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'describe'
                    ? 'bg-[rgba(139,92,246,0.2)] text-[#a78bfa] shadow-sm'
                    : 'text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                简单模式
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'custom'
                    ? 'bg-[rgba(139,92,246,0.2)] text-[#a78bfa] shadow-sm'
                    : 'text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                自定义模式
              </button>
            </div>

            {/* ── 简单模式：描述输入框 ── */}
            {activeTab === 'describe' && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="描述你想要的音乐，例如：一首关于夏日海边的轻快流行曲，吉他伴奏"
                className="w-full bg-transparent text-[#e4e4e7] placeholder-[#52525b] text-sm resize-none outline-none min-h-[80px] max-h-[200px]"
                rows={3}
              />
            )}

            {/* ── 自定义模式 ── */}
            {activeTab === 'custom' && (
              <div className="space-y-3">
                {/* 歌词文本框 */}
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="输入歌词（最少10个字）&#10;[Verse 1]&#10;你的歌词内容..."
                  className="w-full bg-white/[0.03] rounded-xl border border-white/[0.06] text-[#e4e4e7] placeholder-[#52525b] text-sm resize-none outline-none p-3 min-h-[120px] max-h-[240px] focus:border-[#8b5cf6]/30 transition-colors"
                  rows={5}
                />
                {/* 字数提示 */}
                <div className="text-right text-[10px] text-[#555]">
                  {lyrics.length}/10 最低字数要求
                </div>

                {/* 音乐风格输入框 */}
                <div className="relative">
                  <Guitar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                  <input
                    value={styleText}
                    onChange={(e) => setStyleText(e.target.value)}
                    placeholder="音乐风格，如 jazz, piano, female vocal"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#e4e4e7] placeholder-[#52525b] text-sm outline-none focus:border-[#8b5cf6]/30 transition-colors"
                  />
                </div>

                {/* 乐器标签选择行 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {INSTRUMENT_TAGS.map(({ label, icon: Icon }) => {
                    const selected = selectedInstruments.includes(label);
                    return (
                      <button
                        key={label}
                        onClick={() => toggleInstrument(label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border ${
                          selected
                            ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                            : 'bg-white/[0.03] text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 参数行：时长 + 版本 ── */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06] flex-wrap">
              {/* 时长 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#71717a] whitespace-nowrap mr-1">时长</span>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAudioDuration(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all border ${
                      audioDuration === opt.value
                        ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                        : 'text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* 版本 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#71717a] whitespace-nowrap mr-1">版本</span>
                {VERSION_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all border ${
                      version === v
                        ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa] border-[rgba(139,92,246,0.25)]'
                        : 'text-[#71717a] border-white/[0.06] hover:bg-white/[0.06] hover:text-[#a1a1aa]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* 右侧：费用提示 + 生成按钮 */}
              <div className="flex items-center gap-3 ml-auto">
                <CostHint text="按token计费" />
                <SendButton
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
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
