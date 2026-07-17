import { useState } from 'react';
import { Sparkles, Download, Copy, RefreshCw, Upload, Wand2, ZoomIn, Image as ImageIcon } from 'lucide-react';
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

const models = [
  { id: 'stable-diffusion', name: 'Stable Diffusion', description: '开源强大的图像生成模型' },
  { id: 'dall-e', name: 'DALL-E', description: 'OpenAI的先进图像生成模型' },
  { id: 'midjourney', name: 'MidJourney', description: '高质量艺术图像生成' },
];

const styles = [
  { id: 'realistic', name: '写实风格', thumbnail: '🖼️' },
  { id: 'anime', name: '动漫风格', thumbnail: '🎨' },
  { id: 'cyberpunk', name: '赛博朋克', thumbnail: '🌃' },
  { id: 'watercolor', name: '水彩风格', thumbnail: '💧' },
  { id: 'oil-painting', name: '油画风格', thumbnail: '🎭' },
  { id: 'pixel-art', name: '像素艺术', thumbnail: '🎮' },
  { id: '3d-render', name: '3D渲染', thumbnail: '🧊' },
  { id: 'minimalist', name: '极简风格', thumbnail: '⬜' },
];

const resolutions = [
  { id: '512x512', name: '512 × 512' },
  { id: '768x768', name: '768 × 768' },
  { id: '1024x1024', name: '1024 × 1024' },
  { id: '1280x720', name: '1280 × 720 (16:9)' },
  { id: '1920x1080', name: '1920 × 1080 (16:9)' },
];

export default function ImageGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'transfer' | 'enhance'>('generate');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('stable-diffusion');
  const [style, setStyle] = useState('realistic');
  const [resolution, setResolution] = useState('1024x1024');
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [seed, setSeed] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [billingError, setBillingError] = useState('');

  const addProject = useStore((state) => state.addProject);
  const refreshBalance = useAccountStore((state) => state.refreshBalance);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setBillingError('');
    setIsGenerating(true);
    try {
      await runBillableTask({
        model,
        category: 'image',
        estimatedCost: await getEstimatedCost('image', 1),
        description: `独立生图页 ${model} 图片生成`,
        onBalanceChange: refreshBalance,
        run: async () => {
          const result = await api.post<ProviderGenerationResponse>('/image/generate', {
            prompt,
            model,
            style: styles.find((s) => s.id === style)?.name || style,
            resolution,
            steps,
            cfgScale,
            seed,
          });
          const imageUrl = result.url;
          if (!imageUrl) throw new Error('未返回图片地址');
          setGeneratedImage(imageUrl);
          addProject({
            id: `proj-${Date.now()}`,
            name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
            type: 'image',
            status: 'complete',
            inputParams: { prompt, model, style, resolution, steps, cfgScale },
            outputUrl: imageUrl,
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleTransfer = async () => {
    if (!uploadedImage) return;
    setIsGenerating(true);
    try {
      const result = await api.post<ProviderGenerationResponse>('/image/transfer', { style });
      if (result.url) setGeneratedImage(result.url);
      else throw new Error('风格迁移暂不支持');
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : '风格迁移失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhance = async () => {
    if (!uploadedImage) return;
    setIsGenerating(true);
    try {
      const result = await api.post<ProviderGenerationResponse>('/image/enhance', {});
      if (result.url) setGeneratedImage(result.url);
      else throw new Error('图片增强暂不支持');
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : '图片增强失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedImage) {
      await navigator.clipboard.writeText(generatedImage);
    }
  };

  const tabs = [
    { id: 'generate', label: '文本生成图像', icon: Sparkles },
    { id: 'transfer', label: '风格迁移', icon: Wand2 },
    { id: 'enhance', label: '图像增强', icon: ZoomIn },
  ] as const;

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold gradient-text mb-2">AI生图</h1>
        <p className="text-dark-400">多种风格图像生成、风格迁移与图像增强</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5">
          <div className="glassmorphism rounded-2xl p-6">
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

            {activeTab === 'generate' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    描述文本 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述您想要生成的图像，例如：一幅美丽的日落海滩风景，色彩鲜艳，细节丰富..."
                    className="w-full h-32 px-4 py-3 rounded-xl bg-dark-900/50 border border-primary-600/30 text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 resize-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['风景', '人物', '动物', '建筑', '抽象', '科幻'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setPrompt((prev) => prev + (prev ? ' ' : '') + tag)}
                        className="px-3 py-1 rounded-lg text-xs text-dark-300 bg-dark-800/50 hover:bg-primary-600/30 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">选择模型</label>
                  <div className="grid grid-cols-3 gap-3">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                          model === m.id
                            ? 'border-primary-500 bg-primary-600/20'
                            : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                        }`}
                      >
                        <p className="font-medium text-dark-100 text-sm">{m.name}</p>
                        <p className="text-xs text-dark-400 mt-1">{m.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">风格选择</label>
                  <div className="grid grid-cols-4 gap-3">
                    {styles.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`p-3 rounded-xl border transition-all duration-300 ${
                          style === s.id
                            ? 'border-primary-500 bg-primary-600/20'
                            : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                        }`}
                      >
                        <div className="text-2xl mb-1">{s.thumbnail}</div>
                        <p className="text-xs text-dark-300">{s.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">分辨率</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-primary-600/30 text-dark-100 focus:outline-none focus:border-primary-500"
                  >
                    {resolutions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      生成步数: {steps}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      CFG Scale: {cfgScale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="w-full h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">随机种子</label>
                  <input
                    type="number"
                    value={seed || ''}
                    onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
                    placeholder="留空使用随机种子"
                    className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-primary-600/30 text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500"
                  />
                </div>

                {billingError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {billingError}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      生成图像
                    </>
                  )}
                </button>
              </div>
            )}

            {(activeTab === 'transfer' || activeTab === 'enhance') && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-primary-600/30 rounded-xl p-8 text-center hover:border-primary-500/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    {uploadedImage ? (
                      <div>
                        <img src={uploadedImage} alt="Uploaded" className="w-full h-48 object-contain rounded-lg mb-4" />
                        <p className="text-dark-300 text-sm">点击更换图片</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-dark-400 mx-auto mb-4" />
                        <p className="text-dark-300 mb-1">上传图片</p>
                        <p className="text-xs text-dark-400">支持 JPG、PNG、GIF 格式</p>
                      </div>
                    )}
                  </label>
                </div>

                {activeTab === 'transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">目标风格</label>
                    <div className="grid grid-cols-4 gap-3">
                      {styles.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setStyle(s.id)}
                          className={`p-3 rounded-xl border transition-all duration-300 ${
                            style === s.id
                              ? 'border-primary-500 bg-primary-600/20'
                              : 'border-primary-600/30 hover:border-primary-500/50 bg-dark-900/30'
                          }`}
                        >
                          <div className="text-2xl mb-1">{s.thumbnail}</div>
                          <p className="text-xs text-dark-300">{s.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={activeTab === 'transfer' ? handleStyleTransfer : handleEnhance}
                  disabled={!uploadedImage || isGenerating}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      {activeTab === 'transfer' ? '风格迁移' : '图像增强'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-7">
          <div className="glassmorphism rounded-2xl p-6">
            <h3 className="font-display text-lg font-bold text-dark-100 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-400" />
              生成结果
            </h3>
            
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-dark-800">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-3 rounded-xl glassmorphism-light text-dark-300 font-medium hover:text-white hover:bg-primary-900/30 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    复制链接
                  </button>
                  <button
                    onClick={() => window.open(generatedImage, '_blank')}
                    className="flex-1 py-3 rounded-xl glassmorphism-light text-dark-300 font-medium hover:text-white hover:bg-primary-900/30 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载图像
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[600px] rounded-xl bg-dark-800/50 border border-primary-600/20 flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600/30 to-accent-600/30 flex items-center justify-center mb-6 animate-pulse">
                  <ImageIcon className="w-12 h-12 text-dark-400" />
                </div>
                <p className="text-dark-400 text-lg">生成的图像将在此显示</p>
                <p className="text-dark-500 text-sm mt-2">请在左侧输入描述并点击生成</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
