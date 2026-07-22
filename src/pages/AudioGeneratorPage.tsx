import { useState } from 'react';
import { Music, Mic, Volume2, VolumeX, Play, Pause, Download, RefreshCw, Plus, Trash2, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import useAccountStore from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';

interface ProviderGenerationResponse {
  id: string;
  url?: string;
  providerMode?: 'upstream' | 'mock';
  provider?: string;
  upstreamModel?: string;
}

const voices = [
  { id: 'male-1', name: '男声音色1', language: '中文' },
  { id: 'male-2', name: '男声音色2', language: '中文' },
  { id: 'female-1', name: '女声音色1', language: '中文' },
  { id: 'female-2', name: '女声音色2', language: '中文' },
  { id: 'child', name: '童声', language: '中文' },
  { id: 'english-male', name: '英语男声', language: '英语' },
  { id: 'english-female', name: '英语女声', language: '英语' },
];

const genres = [
  { id: 'ambient', name: '氛围音乐', icon: '🌌' },
  { id: 'electronic', name: '电子音乐', icon: '⚡' },
  { id: 'classical', name: '古典音乐', icon: '🎻' },
  { id: 'pop', name: '流行音乐', icon: '🎤' },
  { id: 'rock', name: '摇滚音乐', icon: '🎸' },
  { id: 'jazz', name: '爵士音乐', icon: '🎷' },
  { id: 'lofi', name: 'Lo-Fi', icon: '🎧' },
  { id: 'cinematic', name: '电影配乐', icon: '🎬' },
];

const moods = [
  '平静', '欢快', '悲伤', '浪漫', '紧张', '神秘', '史诗', '温馨',
];

const durations = [15, 30, 45, 60, 90, 120];

const soundEffects = [
  { id: 'applause', name: '掌声', icon: '👏' },
  { id: 'rain', name: '雨声', icon: '🌧️' },
  { id: 'thunder', name: '雷声', icon: '⚡' },
  { id: 'wind', name: '风声', icon: '💨' },
  { id: 'birds', name: '鸟鸣', icon: '🐦' },
  { id: 'waves', name: '海浪', icon: '🌊' },
  { id: 'fire', name: '火焰', icon: '🔥' },
  { id: 'bell', name: '铃声', icon: '🔔' },
];

interface AudioTrack {
  id: string;
  name: string;
  type: 'speech' | 'music' | 'effect';
  duration: number;
  volume: number;
  isPlaying: boolean;
}

export default function AudioGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'speech' | 'music' | 'effects' | 'mixer'>('speech');
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('female-1');
  const [language, setLanguage] = useState('中文');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [billingError, setBillingError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  
  const [genre, setGenre] = useState('ambient');
  const [mood, setMood] = useState('平静');
  const [musicDuration, setMusicDuration] = useState(30);
  
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  
  const [tracks, setTracks] = useState<AudioTrack[]>([]);

  const addProject = useStore((state) => state.addProject);
  const refreshBalance = useAccountStore((state) => state.refreshBalance);

  const handleSpeechGenerate = async () => {
    if (!text.trim()) return;
    setBillingError('');
    setIsGenerating(true);
    try {
      await runBillableTask({
        model: 'openai-tts',
        category: 'audio',
        estimatedCost: await getEstimatedCost('audio', 1),
        description: '独立音频页语音生成',
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/audio/speech', {
            text,
            model: 'openai-tts',
            voice,
            language,
          });
          setGeneratedAudio(result.url || 'speech');
          addProject({
            id: `proj-${Date.now()}`,
            name: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            type: 'audio',
            status: 'complete',
            inputParams: { text, voice, language, providerInfo: result.providerMode },
            outputUrl: result.url,
            createdAt: new Date().toISOString(),
          });
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '语音生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMusicGenerate = async () => {
    setBillingError('');
    setIsGenerating(true);
    try {
      await runBillableTask({
        model: 'suno-v4-5',
        category: 'audio',
        estimatedCost: await getEstimatedCost('audio', 1),
        description: '独立音频页音乐生成',
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/audio/music', {
            model: 'suno-v4-5',
            genre,
            mood,
            duration: musicDuration,
            prompt: `${genre} ${mood} ${musicDuration}秒音乐`,
          });
          setGeneratedAudio(result.url || 'music');
          addProject({
            id: `proj-${Date.now()}`,
            name: `${genre} - ${mood}`,
            type: 'audio',
            status: 'complete',
            inputParams: { genre, mood, duration: musicDuration, providerInfo: result.providerMode },
            outputUrl: result.url,
            createdAt: new Date().toISOString(),
          });
        },
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '音乐生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleEffect = (effectId: string) => {
    setSelectedEffects((prev) =>
      prev.includes(effectId) ? prev.filter((id) => id !== effectId) : [...prev, effectId]
    );
  };

  const addTrack = (type: AudioTrack['type']) => {
    const newTrack: AudioTrack = {
      id: `track-${Date.now()}`,
      name: `${type === 'speech' ? '语音' : type === 'music' ? '音乐' : '音效'} ${tracks.length + 1}`,
      type,
      duration: type === 'music' ? musicDuration : 10,
      volume: 80,
      isPlaying: false,
    };
    setTracks([...tracks, newTrack]);
  };

  const removeTrack = (trackId: string) => {
    setTracks(tracks.filter((t) => t.id !== trackId));
  };

  const tabs = [
    { id: 'speech', label: '文字转语音', icon: Mic },
    { id: 'music', label: '背景音乐', icon: Music },
    { id: 'effects', label: '音效库', icon: Sparkles },
    { id: 'mixer', label: '音频混音', icon: Volume2 },
  ] as const;

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold gradient-text mb-2">音频生成</h1>
        <p className="text-dark-400">文字转语音、背景音乐生成、音效制作与混音</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5">
          <div className="glassmorphism rounded-2xl p-6">
            {billingError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {billingError}
              </div>
            )}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'text-dark-300 hover:bg-primary-900/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'speech' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    文本内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="输入要转换为语音的文本内容..."
                    className="w-full h-32 px-4 py-3 rounded-xl bg-dark-900/50 border border-primary-600/30 text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">选择音色</label>
                  <div className="grid grid-cols-2 gap-3">
                    {voices.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setVoice(v.id);
                          setLanguage(v.language);
                        }}
                        className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                          voice === v.id
                            ? 'border-primary-500 bg-primary-600/20'
                            : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                        }`}
                      >
                        <p className="font-medium text-dark-100 text-sm">{v.name}</p>
                        <p className="text-xs text-dark-400 mt-1">{v.language}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSpeechGenerate}
                  disabled={!text.trim() || isGenerating}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      生成语音中...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      生成语音
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'music' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">音乐类型</label>
                  <div className="grid grid-cols-4 gap-3">
                    {genres.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGenre(g.id)}
                        className={`p-3 rounded-xl border transition-all duration-300 ${
                          genre === g.id
                            ? 'border-primary-500 bg-primary-600/20'
                            : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                        }`}
                      >
                        <div className="text-2xl mb-1">{g.icon}</div>
                        <p className="text-xs text-dark-300">{g.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">情绪风格</label>
                  <div className="flex flex-wrap gap-2">
                    {moods.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                          mood === m
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-900/50 text-dark-300 hover:bg-primary-600/30'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    时长: {musicDuration} 秒
                  </label>
                  <div className="flex gap-2">
                    {durations.map((d) => (
                      <button
                        key={d}
                        onClick={() => setMusicDuration(d)}
                        className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
                          musicDuration === d
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-900/50 text-dark-300 hover:bg-primary-600/30'
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleMusicGenerate}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      生成音乐中...
                    </>
                  ) : (
                    <>
                      <Music className="w-5 h-5" />
                      生成背景音乐
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">选择音效</label>
                  <div className="grid grid-cols-4 gap-3">
                    {soundEffects.map((effect) => (
                      <button
                        key={effect.id}
                        onClick={() => toggleEffect(effect.id)}
                        className={`p-4 rounded-xl border transition-all duration-300 ${
                          selectedEffects.includes(effect.id)
                            ? 'border-primary-500 bg-primary-600/20'
                            : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                        }`}
                      >
                        <div className="text-3xl mb-2">{effect.icon}</div>
                        <p className="text-xs text-dark-300">{effect.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedEffects.length > 0 && (
                  <button
                    onClick={() => {
                      setGeneratedAudio('effects');
                      addProject({
                        id: `proj-${Date.now()}`,
                        name: `音效组合 (${selectedEffects.length})`,
                        type: 'audio',
                        status: 'complete',
                        inputParams: { effects: selectedEffects },
                        createdAt: new Date().toISOString(),
                      });
                    }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    添加选中音效
                  </button>
                )}
              </div>
            )}

            {activeTab === 'mixer' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-dark-200">音轨列表</h4>
                  <div className="flex gap-2">
                    {(['speech', 'music', 'effect'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => addTrack(type)}
                        className="px-3 py-1.5 rounded-lg glassmorphism-light text-dark-300 text-sm hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        {type === 'speech' ? '语音' : type === 'music' ? '音乐' : '音效'}
                      </button>
                    ))}
                  </div>
                </div>

                {tracks.length > 0 ? (
                  <div className="space-y-3">
                    {tracks.map((track) => (
                      <div key={track.id} className="rounded-xl glassmorphism-light p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              track.type === 'speech' ? 'bg-blue-500/20' :
                              track.type === 'music' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                            }`}>
                              {track.type === 'speech' && <Mic className="w-4 h-4 text-blue-400" />}
                              {track.type === 'music' && <Music className="w-4 h-4 text-green-400" />}
                              {track.type === 'effect' && <Sparkles className="w-4 h-4 text-yellow-400" />}
                            </div>
                            <span className="font-medium text-dark-100">{track.name}</span>
                          </div>
                          <button
                            onClick={() => removeTrack(track.id)}
                            className="text-dark-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setTracks(tracks.map((t) => 
                              t.id === track.id ? { ...t, isPlaying: !t.isPlaying } : t
                            ))}
                            className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center"
                          >
                            {track.isPlaying ? (
                              <Pause className="w-4 h-4 text-primary-400" />
                            ) : (
                              <Play className="w-4 h-4 text-primary-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-dark-400 mb-1">
                              <span>音量</span>
                              <span>{track.volume}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={track.volume}
                              onChange={(e) => setTracks(tracks.map((t) => 
                                t.id === track.id ? { ...t, volume: Number(e.target.value) } : t
                              ))}
                              className="w-full h-1.5 bg-dark-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                            />
                          </div>
                          <span className="text-xs text-dark-400">{track.duration}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                    <p className="text-dark-400">点击上方按钮添加音轨</p>
                  </div>
                )}

                {tracks.length > 0 && (
                  <button className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    导出混音
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-7">
          <div className="glassmorphism rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary-400" />
              音频预览
            </h3>
            
            {generatedAudio ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-dark-800/50 p-8">
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-12 h-12 rounded-full glassmorphism-light flex items-center justify-center hover:bg-primary-600/30 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-6 h-6 text-dark-300" />
                      ) : (
                        <Volume2 className="w-6 h-6 text-dark-300" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center button-glow hover:scale-105 transition-transform"
                    >
                      {isPlaying ? (
                        <Pause className="w-10 h-10 text-white" />
                      ) : (
                        <Play className="w-10 h-10 text-white ml-1" />
                      )}
                    </button>
                    <button aria-label="下载音频" className="w-12 h-12 rounded-full glassmorphism-light flex items-center justify-center hover:bg-primary-600/30 transition-colors">
                      <Download className="w-6 h-6 text-dark-300" />
                    </button>
                  </div>
                  
                  <div className="relative h-24 flex items-center justify-center">
                    <div className="flex items-end gap-1 h-full">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-gradient-to-t from-primary-500 to-accent-500 rounded-t transition-all duration-150"
                          style={{
                            height: isPlaying ? `${20 + Math.random() * 80}%` : '20%',
                            animationDelay: `${i * 30}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-dark-400">00:00</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={35}
                        className="w-48 h-1.5 bg-dark-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                      />
                      <span className="text-sm text-dark-400">00:{musicDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-dark-400" />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-24 h-1.5 bg-dark-700 rounded-full appearance-none cursor-pointer accent-primary-500"
                      />
                      <span className="text-sm text-dark-400 text-xs">{volume}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] rounded-xl bg-dark-800/50 border border-primary-600/20 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600/30 to-accent-600/30 flex items-center justify-center mb-6 animate-pulse">
                  <Music className="w-12 h-12 text-dark-400" />
                </div>
                <p className="text-dark-400 text-lg">音频将在此预览</p>
                <p className="text-dark-500 text-sm mt-2">请在左侧选择功能并生成音频</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
