import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Check,
  Clock,
  Copy,
  Download,
  Expand,
  FileText,
  Film,
  HelpCircle,
  ImagePlus,
  Music,
  Pause,
  Pin,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import useAccountStore from '@/store/useAccountStore';
import api from '@/utils/api';
import { getEstimatedCost, runBillableTask } from '@/utils/billing';

type SlotType = 'image' | 'firstFrame' | 'lastFrame' | 'video' | 'audio' | 'text';
type VideoMode = 'text-to-video' | 'image-to-video' | 'first-last-frame' | 'reference' | 'omni' | 'edit';

interface VideoModel {
  id: string;
  name: string;
  successRate: number;
  price?: string;
  mockMode?: boolean;
  apiConfigured?: boolean;
  vendor: string;
  mode: VideoMode;
  description: string;
  tags: string[];
  slots: SlotType[];
  requiredSlots: SlotType[];
  defaults: {
    channel: string;
    count: string;
    mode?: string;
    version?: string;
    ratio: string;
    resolution: string;
    duration: string;
  };
  guide: {
    intro: string;
    abilities: string[];
    specs: string[];
    promptTips: string[];
    usageTips: string[];
  };
}

interface AssetItem {
  id: string;
  type: SlotType;
  name: string;
  meta: string;
  preview: string;
}

interface VideoTask {
  id: string;
  prompt: string;
  modelId: string;
  modelName: string;
  status: 'generating' | 'complete' | 'failed';
  progress: number;
  createdAt: string;
  thumbnailUrl: string;
  outputUrl?: string;
  providerInfo?: string;
  params: Record<string, string>;
  assets: Partial<Record<SlotType, AssetItem[]>>;
}

interface ProviderGenerationResponse {
  id: string;
  url?: string;
  status?: string;
  providerMode?: 'upstream' | 'mock';
  provider?: string;
  upstreamModel?: string;
}

interface VideoGeneratorPageProps {
  generateTrigger?: { text: string; id: number } | null;
}

const officialVideoModels: VideoModel[] = [
  {
    id: 'grok-video-3-5',
    name: 'grok-video-3.5',
    successRate: 98,
    vendor: 'xAI',
    mode: 'image-to-video',
    description:
      'xAI 官方 Imagine 1.5 视频模型，专注图生视频：上传一张首帧参考图即可生成 1-15 秒高质量短视频，自带音频，比例与时长灵活可控。',
    tags: ['图生视频', '自带音频', '响应快'],
    slots: ['firstFrame'],
    requiredSlots: ['firstFrame'],
    defaults: { channel: '综合最优', count: '1条', ratio: '横屏 16:9', resolution: '高清 720p', duration: '6秒' },
    guide: {
      intro: '适合把一张稳定的首帧图快速转成有声短视频，适合封面动效、角色亮相和产品展示。',
      abilities: ['首帧图生视频', '自动补齐运动与音效', '短时长快速预览'],
      specs: ['时长：1-15 秒', '分辨率：720P 为主', '输出：MP4 演示占位'],
      promptTips: ['写清楚主体动作和镜头运动', '说明环境音或氛围', '避免一次写太多不相关动作'],
      usageTips: ['先用 6 秒验证方向', '首帧构图越明确，结果越稳定'],
    },
  },
  {
    id: 'sora-2-official',
    name: 'Sora-2 官转版',
    successRate: 79,
    vendor: 'OpenAI',
    mode: 'text-to-video',
    description:
      'OpenAI Sora-2 稳定版，高质量视频生成，适合复杂场景、电影感镜头和叙事型短片演示。',
    tags: ['文生视频', '电影感', '高质量'],
    slots: [],
    requiredSlots: [],
    defaults: { channel: '综合最优', count: '1条', ratio: '16:9', resolution: '1080P', duration: '8秒' },
    guide: {
      intro: '适合用纯文本生成叙事感较强的视频草稿，重点写清楚场景、人物、镜头和节奏。',
      abilities: ['文本生成视频', '复杂场景理解', '电影级镜头描述'],
      specs: ['比例：16:9 / 9:16 / 1:1', '时长：4-15 秒', '演示输出不消耗真实额度'],
      promptTips: ['使用“场景 + 主体 + 动作 + 镜头 + 光线”结构', '多写运动过程，不只写静态画面'],
      usageTips: ['长剧情拆成多段生成', '先用低清草稿确认构图'],
    },
  },
  {
    id: 'seedance-2-reference',
    name: 'SD 2.0 参考生',
    successRate: 100,
    vendor: '字节跳动即梦',
    mode: 'reference',
    description:
      'Seedance 2.0 支持多图参考生视频，上传 1-9 张参考图，智能融合风格、元素和构图生成新视频。',
    tags: ['多图参考', '有声视频', '4-15秒'],
    slots: ['image'],
    requiredSlots: ['image'],
    defaults: { channel: '综合最优', count: '1条', mode: '参考生', version: '标准', ratio: '自适应', resolution: '720p', duration: '8秒' },
    guide: {
      intro: '适合需要保持角色、道具或画面风格一致的视频生成，参考图数量越充足越容易稳定。',
      abilities: ['1-9 张参考图', '主体一致性', '风格融合'],
      specs: ['时长：4-15 秒', '分辨率：480p / 720p / 1080p', '支持标准/快速模式'],
      promptTips: ['说明每张参考图的用途', '写清楚主体要做什么动作', '避免参考图风格冲突过大'],
      usageTips: ['先用 2-3 张高质量参考图', '同一角色建议使用同角度素材'],
    },
  },
  {
    id: 'seedance-2-omni',
    name: 'SD 2.0 全能参考',
    successRate: 100,
    vendor: '字节跳动即梦',
    mode: 'omni',
    description:
      'Seedance 2.0 全能参考支持文本 + 图片 + 视频 + 音频任意组合参考输入，智能融合多种素材生成高质量有声视频。',
    tags: ['全能参考', '图片视频音频', '多模态'],
    slots: ['image', 'video', 'audio'],
    requiredSlots: ['image'],
    defaults: { channel: '综合最优', count: '1条', mode: '全能参考', version: 'Mini', ratio: '自适应', resolution: '480p', duration: '自动' },
    guide: {
      intro: '适合把图片、视频和音频素材整合成同一条视频草稿，是最接近“素材工作流”的模式。',
      abilities: ['图片参考', '视频参考', '音频参考', '自动融合风格和节奏'],
      specs: ['分辨率：480p / 720p / 1080p', '比例：自动 / 自适应', '输出：有声视频演示'],
      promptTips: ['写明每类素材的参考作用', '说明保留什么、改变什么', '把动作节奏和声音氛围一起描述'],
      usageTips: ['素材越多越要写清优先级', '先用低清版本做方向验证'],
    },
  },
  {
    id: 'kling-omni-reference',
    name: '可灵-Omni 参考生',
    successRate: 100,
    vendor: '可灵',
    mode: 'reference',
    description:
      '可灵 V3 Omni 参考生模式，支持纯文生视频或上传 1-7 张参考图片，AI 参考图片风格/内容智能分镜生成有声视频。',
    tags: ['参考生', '智能分镜', '5-15秒'],
    slots: ['image'],
    requiredSlots: [],
    defaults: { channel: '综合最优', count: '1条', mode: '参考生', version: '高品质', ratio: '16:9', resolution: '720p', duration: '5秒' },
    guide: {
      intro: '适合用少量参考图生成有分镜感的视频，也可以不传图走文生视频兜底。',
      abilities: ['纯文生兜底', '参考图分镜', '有声视频'],
      specs: ['参考图：0-7 张', '时长：5-15 秒', '模式：标准 / 高品质'],
      promptTips: ['分镜式描述更有效', '说明画面变化顺序', '保持角色称呼一致'],
      usageTips: ['需要一致性时传图', '需要创意发散时纯文本生成'],
    },
  },
  {
    id: 'happyhorse-edit',
    name: '快乐马-视频编辑',
    successRate: 100,
    vendor: '阿里百炼',
    mode: 'edit',
    description:
      'HappyHorse 视频编辑以已有视频为主线，可选参考图锚定人物或物体外形，再用自然语言完成风格迁移、换装、局部改写等。',
    tags: ['视频编辑', '风格迁移', '局部改写'],
    slots: ['video', 'image'],
    requiredSlots: ['video'],
    defaults: { channel: '综合最优', count: '1条', mode: '视频编辑', version: '标准', ratio: '跟随原片', resolution: '720P', duration: '跟随原片' },
    guide: {
      intro: '适合对已有视频做局部修改、换风格或换装演示，重点写清楚“保留什么”和“修改什么”。',
      abilities: ['原视频编辑', '参考图锚定', '局部重绘', '风格迁移'],
      specs: ['输入：参考视频必传', '分辨率：720P / 1080P', '时长：跟随原片'],
      promptTips: ['用“保留/替换/增强”写法', '避免把整个画面都重写', '明确局部区域和改动目标'],
      usageTips: ['先短视频试效果', '修改越局部，演示越稳定'],
    },
  },
  {
    id: 'happyhorse-text',
    name: '快乐马-文生视频',
    successRate: 100,
    vendor: '阿里百炼',
    mode: 'text-to-video',
    description:
      'HappyHorse 文生视频：纯文本描述即可生成运动连贯、光影自然的短视频，支持 720P/1080P、3-15 秒多档时长。',
    tags: ['文生视频', '运动连贯', '5种比例'],
    slots: [],
    requiredSlots: [],
    defaults: { channel: '综合最优', count: '1条', ratio: '16:9', resolution: '720P', duration: '5秒' },
    guide: {
      intro: '适合快速用文字生成短视频，无需上传参考图，输出运动连贯、光影自然。',
      abilities: ['文本驱动', '运动与光影自然', '多比例支持'],
      specs: ['分辨率：720P / 1080P', '时长：3-15 秒', '格式：MP4，约 24fps'],
      promptTips: ['多写场景、动作、走位、推拉摇移', '支持较长中文提示词', '用镜头语言描述动态'],
      usageTips: ['单次生成通常较慢，演示版会模拟进度', '长剧情建议多段生成后拼接'],
    },
  },
  {
    id: 'vidu-q3-drama',
    name: 'Vidu Q3 Drama',
    successRate: 98,
    vendor: 'Vidu',
    mode: 'reference',
    description:
      'Vidu Q3 Drama 影视级剧情视频模型，专为精品短剧与 AI 漫剧打造，上传 1-7 张参考图片，生成主体一致的有声剧情视频。',
    tags: ['剧情视频', '漫剧', '主体一致'],
    slots: ['image'],
    requiredSlots: ['image'],
    defaults: { channel: '综合最优', count: '1条', mode: 'Drama', version: 'Pro', ratio: '9:16', resolution: '720P', duration: '8秒' },
    guide: {
      intro: '适合短剧、漫剧和角色对白类视频，重点保持人物一致、站位明确、剧情推进清楚。',
      abilities: ['1-7 张参考图', '人物一致', '对白和音效直出'],
      specs: ['比例：9:16 / 16:9', '分辨率：720P / 1080P', '时长：4-16 秒'],
      promptTips: ['写清角色名、表情、对白和镜头', '每段只推进一个剧情动作'],
      usageTips: ['适合短剧分段生成', '参考图建议统一角色设定'],
    },
  },
];

const demoAssets: AssetItem[] = [
  {
    id: 'asset-text-1',
    type: 'text',
    name: '咖啡馆雨夜分镜',
    meta: '文本 · 132 字',
    preview: '雨夜街角咖啡馆，女主推门进入，镜头从玻璃雨滴慢慢推进到暖色灯光里的侧脸。',
  },
  {
    id: 'asset-image-1',
    type: 'image',
    name: '角色设定图 A',
    meta: '图片 · 9:16',
    preview: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'asset-image-2',
    type: 'image',
    name: '未来城市场景',
    meta: '图片 · 16:9',
    preview: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'asset-video-1',
    type: 'video',
    name: '产品展示原片',
    meta: '视频 · 6 秒',
    preview: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=480&q=80',
  },
  {
    id: 'asset-audio-1',
    type: 'audio',
    name: '低频氛围音乐',
    meta: '音频 · 18 秒',
    preview: 'ambient',
  },
];

const slotLabels: Record<SlotType, string> = {
  image: '参考图片',
  firstFrame: '首帧',
  lastFrame: '尾帧',
  video: '参考视频',
  audio: '参考音频',
  text: '文本素材',
};

const slotHints: Record<SlotType, string> = {
  image: '支持选择多张参考图',
  firstFrame: '用于控制视频开头画面',
  lastFrame: '用于控制视频结尾画面',
  video: '用于视频编辑或运动参考',
  audio: '用于声音、节奏或氛围参考',
  text: '从资产库导入提示词',
};

const paramOptions: Record<string, string[]> = {
  channel: ['综合最优', '高速通道', '质量优先'],
  count: ['1条', '2条', '4条'],
  mode: ['文生视频', '图生视频', '参考生', '全能参考', '视频编辑'],
  version: ['Mini', '标准', 'Pro', '高品质'],
  ratio: ['16:9', '9:16', '1:1', '4:3', '3:4', '自适应', '跟随原片'],
  resolution: ['480p', '540P', '720P', '高清 720p', '1080P', '4K'],
  duration: ['3秒', '5秒', '6秒', '8秒', '10秒', '15秒', '自动', '跟随原片'],
};

const modeLabel: Record<VideoMode, string> = {
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
  'first-last-frame': '首尾帧',
  reference: '参考生',
  omni: '全能参考',
  edit: '视频编辑',
};

function getInitialParams(model: VideoModel) {
  return Object.fromEntries(
    Object.entries(model.defaults).filter(([, value]) => Boolean(value)),
  ) as Record<string, string>;
}

function getTaskImage(prompt: string, modelName: string) {
  return `https://neeko-copilot.bytedance.net/api/text2image?prompt=${encodeURIComponent(
    `${prompt || modelName} cinematic video frame, editorial lighting, premium product demo`,
  )}&image_size=landscape_16_9`;
}

export default function VideoGeneratorPage({ generateTrigger }: VideoGeneratorPageProps) {
  const [activeModelId, setActiveModelId] = useState(officialVideoModels[0].id);
  const [modelQuery, setModelQuery] = useState('');
  const [prompt, setPrompt] = useState('');
  const [params, setParams] = useState<Record<string, string>>(getInitialParams(officialVideoModels[0]));
  const [assets, setAssets] = useState<Partial<Record<SlotType, AssetItem[]>>>({});
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [playingTaskId, setPlayingTaskId] = useState<string | null>(null);
  const [assetPicker, setAssetPicker] = useState<{ open: boolean; slot: SlotType }>({ open: false, slot: 'image' });
  const [guideOpen, setGuideOpen] = useState(false);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [scanUploadOpen, setScanUploadOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [paramSheet, setParamSheet] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const lastTriggerId = useRef<number | null>(null);
  const addProject = useStore((state) => state.addProject);
  const modelApiConfigs = useSettingsStore((state) => state.modelApiConfigs);
  const refreshBalance = useAccountStore((state) => state.refreshBalance);

  const configuredVideoModels = useMemo(() => {
    const merged = officialVideoModels
      .map((model) => {
        const config = modelApiConfigs.find(
          (item) =>
            item.category === 'video' &&
            (item.id === model.id ||
              item.name === model.name ||
              item.officialModel === model.id ||
              item.officialModel === model.name),
        );
        if (config && !config.enabled) return null;
        return {
          ...model,
          successRate: config?.successRate ?? model.successRate,
          price: config?.price,
          mockMode: config?.mockMode ?? true,
          apiConfigured: Boolean(config?.endpoint && config?.apiKey && !config?.mockMode),
        };
      })
      .filter(Boolean) as VideoModel[];
    return merged.length > 0 ? merged : officialVideoModels;
  }, [modelApiConfigs]);

  const activeModel = configuredVideoModels.find((model) => model.id === activeModelId) || configuredVideoModels[0] || officialVideoModels[0];

  const filteredModels = useMemo(() => {
    const keyword = modelQuery.trim().toLowerCase();
    if (!keyword) return configuredVideoModels;
    return configuredVideoModels.filter((model) =>
      [model.name, model.vendor, model.description, ...model.tags].join(' ').toLowerCase().includes(keyword),
    );
  }, [configuredVideoModels, modelQuery]);

  const filteredTasks = useMemo(() => {
    const keyword = taskFilter.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchedModel = task.modelId === activeModel.id;
      const matchedText = !keyword || [task.prompt, task.modelName].join(' ').toLowerCase().includes(keyword);
      return matchedModel && matchedText;
    });
  }, [activeModel.id, taskFilter, tasks]);

  useEffect(() => {
    if (generateTrigger && generateTrigger.id !== lastTriggerId.current) {
      lastTriggerId.current = generateTrigger.id;
      setPrompt(generateTrigger.text);
      handleGenerate(generateTrigger.text);
    }
    // 外部触发器只按 id 响应一次，避免 handleGenerate 依赖变化造成重复生成。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateTrigger]);

  useEffect(() => {
    if (!configuredVideoModels.some((model) => model.id === activeModelId)) {
      const fallback = configuredVideoModels[0] || officialVideoModels[0];
      setActiveModelId(fallback.id);
      setParams(getInitialParams(fallback));
      setAssets({});
    }
  }, [activeModelId, configuredVideoModels]);

  const selectModel = (model: VideoModel) => {
    setActiveModelId(model.id);
    setParams(getInitialParams(model));
    setAssets({});
    setGuideOpen(false);
  };

  const updateParam = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setParamSheet(null);
  };

  const addAssetToSlot = (slot: SlotType, asset: AssetItem) => {
    if (slot === 'text') {
      setPrompt((prev) => (prev ? `${prev}\n${asset.preview}` : asset.preview));
      setAssetPicker({ open: false, slot });
      return;
    }
    setAssets((prev) => {
      const current = prev[slot] || [];
      return { ...prev, [slot]: [...current, asset].slice(0, slot === 'image' ? 9 : 1) };
    });
    setAssetPicker({ open: false, slot });
  };

  const removeAsset = (slot: SlotType, assetId: string) => {
    setAssets((prev) => ({ ...prev, [slot]: (prev[slot] || []).filter((item) => item.id !== assetId) }));
  };

  const simulateUpload = (slot: SlotType) => {
    const mock: AssetItem = {
      id: `upload-${slot}-${Date.now()}`,
      type: slot,
      name: `${slotLabels[slot]}演示素材`,
      meta: '本地上传 · 演示占位',
      preview:
        slot === 'audio'
          ? 'waveform'
          : `https://neeko-copilot.bytedance.net/api/text2image?prompt=${encodeURIComponent(`${slotLabels[slot]} visual placeholder for ai video workspace`)}&image_size=landscape_16_9`,
    };
    addAssetToSlot(slot, mock);
  };

  const validateRequiredSlots = () => {
    return activeModel.requiredSlots.every((slot) => (assets[slot] || []).length > 0);
  };

  const handleGenerate = async (externalPrompt?: string) => {
    const finalPrompt = (externalPrompt ?? prompt).trim();
    if (!finalPrompt || !validateRequiredSlots()) return;

    const taskId = `video-${Date.now()}`;
    const taskImage = getTaskImage(finalPrompt, activeModel.name);
    const newTask: VideoTask = {
      id: taskId,
      prompt: finalPrompt,
      modelId: activeModel.id,
      modelName: activeModel.name,
      status: 'generating',
      progress: 8,
      createdAt: new Date().toISOString(),
      thumbnailUrl: taskImage,
      params,
      assets,
    };

    setTasks((prev) => [newTask, ...prev]);

    try {
      await runBillableTask({
        model: activeModel.id,
        category: 'video',
        estimatedCost: await getEstimatedCost('video', 1, Number.parseInt(params.duration || '6', 10) || 6),
        description: `独立视频页 ${activeModel.name} 视频生成`,
        taskId,
        onBalanceChange: refreshBalance,
        run: async () => {
          await new Promise<void>((resolve) => {
            const timer = window.setInterval(() => {
              setTasks((prev) =>
                prev.map((task) => {
                  if (task.id !== taskId || task.status !== 'generating') return task;
                  const nextProgress = Math.min(task.progress + Math.floor(Math.random() * 14) + 8, 92);
                  return { ...task, progress: nextProgress };
                }),
              );
            }, 520);
            window.setTimeout(() => {
              window.clearInterval(timer);
              resolve();
            }, 2600);
          });

          const result = await api.post<ProviderGenerationResponse>('/video/generate', {
            prompt: finalPrompt,
            model: activeModel.id,
            resolution: params.resolution,
            duration: params.duration,
            aspectRatio: params.ratio,
            style: modeLabel[activeModel.mode],
          });
          const outputUrl = result.url || getTaskImage(finalPrompt, `${activeModel.name} completed`);
          setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'complete', progress: 100, outputUrl } : task)));
          addProject({
            id: `proj-${Date.now()}`,
            name: `${activeModel.name} · ${finalPrompt.slice(0, 22)}${finalPrompt.length > 22 ? '...' : ''}`,
            type: 'video',
            status: 'complete',
            inputParams: {
              prompt: finalPrompt,
              model: activeModel.name,
              mode: modeLabel[activeModel.mode],
              params,
              assets,
            },
            outputUrl,
            createdAt: new Date().toISOString(),
          });
        },
      });
    } catch {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'failed', progress: 100 } : task)));
    }
  };

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 浏览器权限不可用时忽略，演示功能不阻断流程。
    }
  };

  const savePromptDraft = () => {
    setPrompt(promptDraft);
    setPromptEditorOpen(false);
  };

  const openPromptEditor = () => {
    setPromptDraft(prompt);
    setPromptEditorOpen(true);
  };

  const requiredHint = activeModel.requiredSlots.length
    ? `需添加：${activeModel.requiredSlots.map((slot) => slotLabels[slot]).join('、')}`
    : '纯文本即可生成';

  const canGenerate = prompt.trim().length > 0 && validateRequiredSlots();

  return (
    <div className="video-studio">
      <section className="video-model-rail glass">
        <div className="video-section-header">
          <div>
            <p className="video-kicker">VIDEO MODELS</p>
            <h2>官方视频模型</h2>
          </div>
          <span>{filteredModels.length} 个</span>
        </div>
        <div className="video-search-box">
          <Search size={15} />
          <input
            value={modelQuery}
            onChange={(event) => setModelQuery(event.target.value)}
            placeholder="搜索视频模型..."
          />
        </div>
        <div className="video-model-list">
          {filteredModels.map((model) => (
            <button
              key={model.id}
              type="button"
              className={`video-model-card ${activeModel.id === model.id ? 'active' : ''}`}
              onClick={() => selectModel(model)}
            >
              <span className="video-pin">
                <Pin size={12} />
                置顶
              </span>
              <div className="video-model-card-head">
                <div>
                  <h3>{model.name}</h3>
                  <p>{model.vendor}</p>
                </div>
                <strong>{model.successRate}%</strong>
              </div>
              <p className="video-model-desc">{model.description}</p>
              <div className="video-tag-row">
                <span>{model.apiConfigured ? '真实接口' : '模拟兜底'}</span>
                {model.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="video-workbench">
        <div className="video-hero glass">
          <div>
            <p className="video-kicker">{modeLabel[activeModel.mode]}</p>
            <h1>{activeModel.name}</h1>
            <p>{activeModel.description}</p>
          </div>
          <div className="video-hero-actions">
            <button type="button" className="video-ghost-btn" onClick={() => setGuideOpen(true)}>
              <HelpCircle size={16} />
              看看怎么玩
            </button>
            <button type="button" className="video-ghost-btn" onClick={() => setAssetPicker({ open: true, slot: 'text' })}>
              <Archive size={16} />
              导入文本
            </button>
          </div>
        </div>

        <div className="video-composer glass">
          <div className="video-slot-grid">
            {activeModel.slots.map((slot) => {
              const slotAssets = assets[slot] || [];
              return (
                <div key={slot} className={`video-slot-card ${activeModel.requiredSlots.includes(slot) ? 'required' : ''}`}>
                  <div className="video-slot-top">
                    <div>
                      <span>{slotLabels[slot]}</span>
                      <p>{slotHints[slot]}</p>
                    </div>
                    {activeModel.requiredSlots.includes(slot) && <em>必填</em>}
                  </div>
                  {slotAssets.length > 0 ? (
                    <div className="video-asset-chips">
                      {slotAssets.map((asset) => (
                        <div key={asset.id} className="video-asset-chip">
                          {asset.type === 'audio' ? (
                            <Music size={16} />
                          ) : asset.type === 'video' ? (
                            <Video size={16} />
                          ) : (
                            <ImagePlus size={16} />
                          )}
                          <span>{asset.name}</span>
                          <button type="button" onClick={() => removeAsset(slot, asset.id)}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="video-slot-empty">
                      <Plus size={18} />
                      <span>添加素材</span>
                    </div>
                  )}
                  <div className="video-slot-actions">
                    <button type="button" onClick={() => setAssetPicker({ open: true, slot })}>
                      <Archive size={14} />
                      资产库
                    </button>
                    <button type="button" onClick={() => simulateUpload(slot)}>
                      <Upload size={14} />
                      本地演示
                    </button>
                    <button type="button" onClick={() => setScanUploadOpen(true)}>
                      <QrCode size={14} />
                      手机扫码
                    </button>
                  </div>
                </div>
              );
            })}
            {activeModel.slots.length === 0 && (
              <div className="video-text-only-card">
                <Wand2 size={22} />
                <div>
                  <h3>纯文本生成</h3>
                  <p>该模型不需要上传素材，写清楚场景、动作、镜头和光线即可开始模拟生成。</p>
                </div>
              </div>
            )}
          </div>

          <div className="video-prompt-shell">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="描述你想生成的视频：场景、主体、动作、镜头运动、光线、声音和情绪..."
            />
            <div className="video-prompt-footer">
              <div className="video-prompt-tools">
                <span className={validateRequiredSlots() ? 'ready' : 'warning'}>
                  {validateRequiredSlots() ? <Check size={13} /> : <AlertCircle size={13} />}
                  {requiredHint}
                </span>
                <button type="button" onClick={openPromptEditor}>
                  <Expand size={14} />
                  全屏编辑
                </button>
                <button type="button" onClick={() => setPrompt('')}>
                  <Trash2 size={14} />
                  清空
                </button>
              </div>
              <button type="button" className="video-send-btn" disabled={!canGenerate} onClick={() => handleGenerate()}>
                <Send size={15} />
                生成视频
              </button>
            </div>
          </div>

          <div className="video-param-row">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="video-param-select">
                <span>{key === 'channel' ? '通道' : key === 'count' ? '数量' : key === 'ratio' ? '画幅' : key === 'resolution' ? '清晰度' : key === 'duration' ? '时长' : key === 'mode' ? '模式' : '版本'}</span>
                <button type="button" className="video-param-trigger" onClick={() => setParamSheet(key)}>
                  {value}
                  <SlidersHorizontal size={13} />
                </button>
              </div>
            ))}
            <button type="button" className="video-cost-pill" onClick={() => setPriceOpen(true)}>
              <Sparkles size={14} />
              {activeModel.price || '演示预计 12-36 积分'}
            </button>
          </div>
        </div>

        <div className="video-result-area">
          <div className="video-section-header">
            <div>
              <p className="video-kicker">TASKS</p>
              <h2>当前模型任务</h2>
            </div>
            <div className="video-task-search">
              <Search size={14} />
              <input value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)} placeholder="按提示词搜索" />
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="video-empty-state glass">
              <Film size={36} />
              <h3>暂无 {activeModel.name} 任务</h3>
              <p>填写提示词并补齐必填素材后，生成的演示视频会出现在这里。</p>
            </div>
          ) : (
            <div className="video-task-grid">
              {filteredTasks.map((task) => (
                <article key={task.id} className="video-task-card glass">
                  <div className="video-task-preview">
                    <img src={task.thumbnailUrl} alt={task.prompt} />
                    {task.status === 'generating' ? (
                      <div className="video-progress-layer">
                        <RefreshCw className="animate-spin" size={26} />
                        <span>生成中 {task.progress}%</span>
                        <div>
                          <i style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="video-play-btn" onClick={() => setPlayingTaskId(playingTaskId === task.id ? null : task.id)}>
                        {playingTaskId === task.id ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                    )}
                  </div>
                  <div className="video-task-body">
                    <div className="video-task-meta">
                      <span>{task.modelName}</span>
                      <span>
                        <Clock size={12} />
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p>{task.prompt}</p>
                    <div className="video-task-actions">
                      <button type="button" onClick={() => copyPrompt(task.prompt)}>
                        <Copy size={14} />
                        复制提示词
                      </button>
                      <button type="button" onClick={() => handleGenerate(task.prompt)}>
                        <RefreshCw size={14} />
                        再次生成
                      </button>
                      {task.outputUrl && (
                        <button type="button" onClick={() => window.open(task.outputUrl, '_blank')}>
                          <Download size={14} />
                          查看
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {guideOpen && (
        <div className="video-modal-overlay" onClick={() => setGuideOpen(false)}>
          <div className="video-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="video-modal-close" onClick={() => setGuideOpen(false)}>
              <X size={18} />
            </button>
            <p className="video-kicker">快速上手指南</p>
            <h2>{activeModel.name}</h2>
            <section>
              <h3>模型简介</h3>
              <p>{activeModel.guide.intro}</p>
            </section>
            <section>
              <h3>核心能力</h3>
              <ul>{activeModel.guide.abilities.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h3>成片规格</h3>
              <ul>{activeModel.guide.specs.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h3>提示词写法</h3>
              <ul>{activeModel.guide.promptTips.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h3>使用提示</h3>
              <ul>{activeModel.guide.usageTips.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <button type="button" className="video-modal-primary" onClick={() => setGuideOpen(false)}>
              好的，去试试
            </button>
          </div>
        </div>
      )}

      {assetPicker.open && (
        <div className="video-modal-overlay" onClick={() => setAssetPicker({ open: false, slot: assetPicker.slot })}>
          <div className="video-asset-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="video-modal-close" onClick={() => setAssetPicker({ open: false, slot: assetPicker.slot })}>
              <X size={18} />
            </button>
            <div className="video-section-header">
              <div>
                <p className="video-kicker">ASSET LIBRARY</p>
                <h2>从资产库导入{slotLabels[assetPicker.slot]}</h2>
              </div>
              <button type="button" className="video-ghost-btn">
                <Plus size={15} />
                新建素材
              </button>
            </div>
            <div className="video-search-box">
              <Search size={15} />
              <input placeholder="搜索资产名称..." />
            </div>
            <div className="video-asset-list">
              {demoAssets
                .filter((asset) => assetPicker.slot === 'text' ? asset.type === 'text' : asset.type === assetPicker.slot)
                .map((asset) => (
                  <button key={asset.id} type="button" className="video-asset-row" onClick={() => addAssetToSlot(assetPicker.slot, asset)}>
                    {asset.type === 'audio' ? <Music size={18} /> : asset.type === 'video' ? <Video size={18} /> : asset.type === 'text' ? <FileText size={18} /> : <ImagePlus size={18} />}
                    <div>
                      <strong>{asset.name}</strong>
                      <span>{asset.meta}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {scanUploadOpen && (
        <div className="video-modal-overlay" onClick={() => setScanUploadOpen(false)}>
          <div className="video-scan-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="video-modal-close" onClick={() => setScanUploadOpen(false)}>
              <X size={18} />
            </button>
            <p className="video-kicker">MOBILE UPLOAD</p>
            <h2>手机扫码上传</h2>
            <p className="video-muted">用手机扫码选择图片、视频或音频，上传后会自动填入当前模型需要的位置。</p>
            <div className="video-qr-box">
              <QrCode size={72} />
              <strong>二维码 10 分钟内有效</strong>
              <span>0 / 5</span>
            </div>
            <p className="video-muted">安全提示：二维码仅本次有效，不包含登录信息；请勿转发给他人。</p>
          </div>
        </div>
      )}

      {priceOpen && (
        <div className="video-modal-overlay" onClick={() => setPriceOpen(false)}>
          <div className="video-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="video-modal-close" onClick={() => setPriceOpen(false)}>
              <X size={18} />
            </button>
            <p className="video-kicker">PRICE DETAIL</p>
            <h2>{activeModel.name} 计费说明</h2>
            <section>
              <h3>预计价格</h3>
              <p>{activeModel.price || '演示预计 12-36 积分'}，实际接入后可由后台模型接口配置覆盖。</p>
            </section>
            <section>
              <h3>参考站逻辑</h3>
              <ul>
                <li>价格随模型、分辨率、时长、数量、是否含参考视频变化。</li>
                <li>部分视频编辑模型按“输入视频时长 + 输出视频时长”合计扣费。</li>
                <li>智能调度会综合价格、成功率、速度与实时拥堵分流。</li>
              </ul>
            </section>
            <section>
              <h3>当前通道</h3>
              <p>{activeModel.apiConfigured ? '真实接口已配置' : '本地模拟兜底'} · 成功率展示 {activeModel.successRate}%</p>
            </section>
          </div>
        </div>
      )}

      {paramSheet && (
        <div className="video-modal-overlay" onClick={() => setParamSheet(null)}>
          <div className="video-param-sheet" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="video-modal-close" onClick={() => setParamSheet(null)}>
              <X size={18} />
            </button>
            <p className="video-kicker">PARAMETER</p>
            <h2>{paramSheet === 'channel' ? '选择渠道' : paramSheet === 'count' ? '数量' : paramSheet === 'ratio' ? '画面宽高比' : paramSheet === 'resolution' ? '分辨率' : paramSheet === 'duration' ? '视频时长' : '参数设置'}</h2>
            {paramSheet === 'channel' && (
              <div className="video-channel-explain">
                <strong>什么是智能调度</strong>
                <p>自动容错，综合价格、成功率、速度与实时拥堵智能分流，自动避开拥堵渠道。</p>
                <div><span>ABX-默认分组</span><em>100.0% · 2分2秒 · ⚡0.9365/秒</em></div>
              </div>
            )}
            <div className="video-param-option-grid">
              {(paramOptions[paramSheet] || [params[paramSheet]]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={params[paramSheet] === option ? 'active' : ''}
                  onClick={() => updateParam(paramSheet, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {promptEditorOpen && (
        <div className="video-modal-overlay" onClick={() => setPromptEditorOpen(false)}>
          <div className="video-prompt-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="video-modal-close" onClick={() => setPromptEditorOpen(false)}>
              <X size={18} />
            </button>
            <p className="video-kicker">PROMPT EDITOR</p>
            <h2>全屏编辑提示词</h2>
            <p className="video-muted">适合编写较长提示词，Ctrl/Cmd + Enter 可快速保存。</p>
            <textarea
              value={promptDraft}
              onChange={(event) => setPromptDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') savePromptDraft();
              }}
              autoFocus
            />
            <div className="video-prompt-modal-footer">
              <span>{promptDraft.length} 字</span>
              <div>
                <button type="button" onClick={() => setPromptEditorOpen(false)}>取消</button>
                <button type="button" onClick={savePromptDraft}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
