export interface AIModel {
  id: string;
  name: string;
  description: string;
  category: 'chat' | 'image' | 'video' | 'audio';
  icon: string;
  tags: string[];
  isNew?: boolean;
  isHot?: boolean;
  isFree?: boolean;
  isMultimodal?: boolean;
  isPinned?: boolean;
}

export const aiModels: AIModel[] = [
  {
    id: 'multi-model-collab',
    name: '多模型协作',
    description: '多个模型并行回答问题，最终由一个模型统一总结，给你更全面、更可靠的答案。',
    category: 'chat',
    icon: '🤝',
    tags: ['工具'],
    isMultimodal: true,
    isPinned: true,
  },
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    description: 'OpenAI 最新一代大语言模型，推理能力与创意表现全面提升。',
    category: 'chat',
    icon: '🟢',
    tags: ['热门'],
    isHot: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: '多模态大模型，支持文本、图像、语音的理解与生成。',
    category: 'chat',
    icon: '🟢',
    tags: ['多模态'],
    isMultimodal: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    description: '轻量级多模态模型，速度更快，性价比更高。',
    category: 'chat',
    icon: '🟢',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'claude-opus',
    name: 'Claude 3.7 Opus',
    description: 'Anthropic 旗舰模型，长文本理解与深度思考能力卓越。',
    category: 'chat',
    icon: '🟠',
    tags: ['新品'],
    isNew: true,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3.7 Sonnet',
    description: '平衡性能与速度的智能模型，适合大多数日常任务。',
    category: 'chat',
    icon: '🟠',
    tags: [],
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    description: 'Google 最新多模态模型，原生支持视频理解与生成。',
    category: 'chat',
    icon: '🔵',
    tags: ['多模态', '新品'],
    isNew: true,
    isMultimodal: true,
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 3 Flash',
    description: '高速响应的轻量模型，适合实时交互场景。',
    category: 'chat',
    icon: '🔵',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    description: 'xAI 旗舰模型，实时联网搜索，数学与推理能力出色。',
    category: 'chat',
    icon: '⚫',
    tags: ['热门'],
    isHot: true,
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    description: '深度求索最新开源模型，中文理解能力优秀。',
    category: 'chat',
    icon: '🔷',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: '推理增强模型，复杂数学与逻辑问题表现突出。',
    category: 'chat',
    icon: '🔷',
    tags: ['推理', '新品'],
    isNew: true,
  },
  {
    id: 'qwen-3.7',
    name: '通义千问 3.7',
    description: '阿里巴巴最新大模型，中文能力强，支持超长上下文。',
    category: 'chat',
    icon: '🦋',
    tags: [],
  },
  {
    id: 'glm-5.2',
    name: 'GLM-5.2',
    description: '智谱 AI 最新模型，代码生成与创意写作俱佳。',
    category: 'chat',
    icon: '🌟',
    tags: [],
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2',
    description: '月之暗面最新模型，超长上下文支持 200 万字。',
    category: 'chat',
    icon: '🌙',
    tags: ['长文本'],
  },
  {
    id: 'doubao-pro',
    name: '豆包 Pro',
    description: '字节跳动最新大模型，创意生成与对话体验优秀。',
    category: 'chat',
    icon: '🫘',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    description: 'OpenAI 最新一代图像生成模型，语义理解与细节表现更强，支持文生图与图生图。',
    category: 'image',
    icon: '🟢',
    tags: ['热门'],
    isHot: true,
  },
  {
    id: 'midjourney-v7',
    name: 'Midjourney V7',
    description: '业界顶尖的图像生成模型，艺术风格表现卓越，适合创意设计。',
    category: 'image',
    icon: '🎨',
    tags: ['艺术'],
  },
  {
    id: 'flux-1-pro',
    name: 'FLUX 1 Pro',
    description: 'Black Forest Labs 旗舰模型，真实感与细节表现力惊人。',
    category: 'image',
    icon: '⚡',
    tags: ['新品', '热门'],
    isNew: true,
    isHot: true,
  },
  {
    id: 'flux-dev',
    name: 'FLUX 1 Dev',
    description: 'FLUX 开发者版本，开源可微调，社区生态丰富。',
    category: 'image',
    icon: '⚡',
    tags: ['开源'],
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    description: '快速高质量图像生成，专为电商和产品图优化。',
    category: 'image',
    icon: '🍌',
    tags: ['电商', '新品'],
    isNew: true,
  },
  {
    id: 'seedream-5',
    name: 'Seedream 5.0',
    description: '腾讯最新图像生成模型，中文理解出色。',
    category: 'image',
    icon: '🌙',
    tags: [],
  },
  {
    id: 'jimeng-3',
    name: '即梦 3.0',
    description: '字节跳动图像生成模型，风格多样，创意十足。',
    category: 'image',
    icon: '💫',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'wan-2.1',
    name: 'Wan 2.1',
    description: '阿里巴巴最新图像生成模型，支持多种风格。',
    category: 'image',
    icon: '🦋',
    tags: [],
  },
  {
    id: 'hunyuan-image',
    name: '混元图像',
    description: '腾讯混元图像生成模型，中文提示词理解精准。',
    category: 'image',
    icon: '🔮',
    tags: [],
  },
  {
    id: 'stable-diffusion-3',
    name: 'Stable Diffusion 3',
    description: 'Stability AI 最新开源模型，社区生态最丰富。',
    category: 'image',
    icon: '🟣',
    tags: ['开源', '免费'],
    isFree: true,
  },
  {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    description: 'OpenAI 经典图像生成模型，语义理解准确。',
    category: 'image',
    icon: '🟢',
    tags: ['经典'],
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    description: 'OpenAI 最新视频生成模型，电影级画质，支持复杂场景与长视频生成。',
    category: 'video',
    icon: '🟢',
    tags: ['新品', '热门'],
    isNew: true,
    isHot: true,
  },
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    description: 'Google 视频生成旗舰模型，4K 分辨率，电影级运镜。',
    category: 'video',
    icon: '🔵',
    tags: ['4K'],
  },
  {
    id: 'kling-3',
    name: '可灵 3.0',
    description: '快手最新视频生成模型，中文理解出色，人物表现优秀。',
    category: 'video',
    icon: '🎬',
    tags: ['热门'],
    isHot: true,
  },
  {
    id: 'grok-video',
    name: 'Grok Video',
    description: 'xAI 视频生成模型，实时风格，速度极快。',
    category: 'video',
    icon: '⚫',
    tags: ['新品'],
    isNew: true,
  },
  {
    id: 'luma-dream',
    name: 'Luma Dream Machine',
    description: 'Luma AI 旗舰视频模型，3D 运镜效果卓越。',
    category: 'video',
    icon: '💫',
    tags: ['3D'],
  },
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3',
    description: 'Runway 最新视频生成模型，专业级影视制作工具。',
    category: 'video',
    icon: '🎥',
    tags: ['专业'],
  },
  {
    id: 'vidu-q3',
    name: 'Vidu Q3',
    description: '生数科技最新视频模型，角色一致性出色。',
    category: 'video',
    icon: '🎞️',
    tags: [],
  },
  {
    id: 'seedance',
    name: 'Seedance',
    description: '腾讯视频生成模型，舞蹈动作精准还原。',
    category: 'video',
    icon: '💃',
    tags: ['舞蹈'],
  },
  {
    id: 'hailuo-video',
    name: '海螺 AI 视频',
    description: 'MiniMax 视频生成模型，支持超长视频。',
    category: 'video',
    icon: '🐚',
    tags: ['长视频'],
  },
  {
    id: 'pixverse-v3',
    name: 'PixVerse V3',
    description: '爱诗科技视频模型，风格化视频表现出色。',
    category: 'video',
    icon: '✨',
    tags: ['风格化'],
  },
  {
    id: 'suno-v4-5',
    name: 'Suno V4.5',
    description: '业界领先的 AI 音乐生成模型，支持多种风格，高质量作曲与演唱。',
    category: 'audio',
    icon: '🎵',
    tags: ['热门'],
    isHot: true,
  },
  {
    id: 'suno-v3',
    name: 'Suno V3',
    description: '经典音乐生成模型，稳定可靠，风格多样。',
    category: 'audio',
    icon: '🎵',
    tags: ['经典'],
  },
  {
    id: 'hailuo-music',
    name: '海螺音乐',
    description: 'MiniMax 音乐生成模型，中文歌曲表现优秀。',
    category: 'audio',
    icon: '🐚',
    tags: ['中文'],
  },
  {
    id: 'gemini-tts',
    name: 'Gemini 3.1 TTS',
    description: 'Google 最新语音合成模型，多语言多音色，自然度极高。',
    category: 'audio',
    icon: '🔵',
    tags: ['新品'],
    isNew: true,
  },
  {
    id: 'elevenlabs-v3',
    name: 'ElevenLabs V3',
    description: '顶级语音合成模型，声音克隆与情感表现卓越。',
    category: 'audio',
    icon: '🎙️',
    tags: ['克隆'],
  },
  {
    id: 'openai-tts',
    name: 'OpenAI TTS',
    description: 'OpenAI 文字转语音，自然流畅，支持多种音色。',
    category: 'audio',
    icon: '🟢',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'fish-speech',
    name: 'Fish Speech',
    description: '开源语音合成模型，中文效果优秀，可本地部署。',
    category: 'audio',
    icon: '🐟',
    tags: ['开源', '免费'],
    isFree: true,
  },
  {
    id: 'edge-tts',
    name: 'Edge TTS',
    description: '微软语音合成，多语言多方言，稳定免费。',
    category: 'audio',
    icon: '💙',
    tags: ['免费'],
    isFree: true,
  },
  {
    id: 'doubao-tts',
    name: '豆包语音',
    description: '字节跳动语音合成，音色丰富，情感表现力强。',
    category: 'audio',
    icon: '🫘',
    tags: [],
  },
  {
    id: 'xfyun-tts',
    name: '讯飞语音',
    description: '科大讯飞语音合成，中文发音标准，支持多方言。',
    category: 'audio',
    icon: '🎤',
    tags: ['方言'],
  },
];

export const primaryCategories = [
  { id: 'damoxing', label: '大模型', icon: 'sparkles', hasSub: true },
  { id: 'zhinengti', label: '智能体', icon: 'user' },
  { id: 'linggan', label: '灵感广场', icon: 'lightbulb' },
];

export const secondaryCategories = [
  { id: 'all', label: '全部' },
  { id: 'chat', label: '聊天' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
  { id: 'mine', label: '我的' },
];

export const getFilteredModels = (primary: string, secondary: string, search: string): AIModel[] => {
  let filtered = aiModels;

  if (primary !== 'damoxing') {
    return [];
  }

  if (secondary !== 'all' && secondary !== 'mine') {
    filtered = filtered.filter((m) => m.category === secondary);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const pinned = filtered.filter((m) => m.isPinned);
  const rest = filtered.filter((m) => !m.isPinned);

  return [...pinned, ...rest];
};
