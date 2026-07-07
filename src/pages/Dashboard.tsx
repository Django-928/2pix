import { Image, Video, Music, MessageSquare, LayoutGrid, ArrowRight, TrendingUp, Zap, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  {
    path: '/image',
    icon: Image,
    title: 'AI生图',
    description: '文本生成图像、风格迁移、图像修复增强',
    gradient: 'from-[#8b5cf6] to-[#6366f1]',
  },
  {
    path: '/video',
    icon: Video,
    title: 'AI生视频',
    description: '文本转视频、图像转视频、视频风格化',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    path: '/audio',
    icon: Music,
    title: '音频生成',
    description: '文字转语音、背景音乐、音效制作',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    path: '/chat',
    icon: MessageSquare,
    title: 'AI对话',
    description: '智能对话、创意生成、专业知识问答',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    path: '/canvas',
    icon: LayoutGrid,
    title: '无限画布',
    description: '整合AI内容、图层管理、创意工作空间',
    gradient: 'from-yellow-500 to-orange-500',
  },
];

const stats = [
  { icon: Zap, label: '生成次数', value: '1,234', change: '+12%' },
  { icon: TrendingUp, label: '项目数量', value: '86', change: '+8%' },
  { icon: Award, label: '使用时长', value: '23小时', change: '+15%' },
];

const recentProjects = [
  { id: 1, type: 'image', name: '赛博朋克城市', preview: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=cyberpunk%20city%20night%20neon%20lights&image_size=landscape_16_9' },
  { id: 2, type: 'video', name: '自然风光延时', preview: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=nature%20landscape%20mountains%20sunset&image_size=landscape_16_9' },
  { id: 3, type: 'audio', name: '背景音乐创作', preview: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=abstract%20music%20waves%20colorful&image_size=square' },
  { id: 4, type: 'canvas', name: '创意设计稿', preview: 'https://neeko-copilot.bytedance.net/api/text2image?prompt=creative%20design%20layout%20artistic&image_size=square' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen p-8">
      <section className="mb-12 fade-in">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900/50 via-dark-900 to-accent-900/50 p-12 border border-primary-600/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.15),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.15),transparent_50%)]"></div>
          
          <div className="relative z-10">
            <h1 className="font-display text-4xl font-bold mb-4">
              <span className="gradient-text">释放创意潜能</span>
            </h1>
            <p className="text-dark-300 text-lg mb-8 max-w-2xl">
              一站式AI创作平台，集成图像、视频、音频生成与智能对话，为创作者提供无限可能
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/image"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium button-glow hover:scale-105 transition-transform"
              >
                开始创作
              </Link>
              <button className="px-6 py-3 rounded-xl glassmorphism-light text-dark-100 font-medium hover:bg-primary-900/30 transition-colors">
                了解更多
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12 fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="grid grid-cols-3 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="rounded-2xl glassmorphism p-6 hover:border-primary-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <span className="text-sm text-green-400 font-medium">{stat.change}</span>
                </div>
                <p className="text-3xl font-display font-bold text-dark-100 mb-1">{stat.value}</p>
                <p className="text-dark-400 text-sm">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-12 fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-dark-100">功能模块</h2>
        </div>
        <div className="grid grid-cols-5 gap-6">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className="group rounded-2xl glassmorphism p-6 hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${0.2 + index * 0.05}s` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-dark-100 mb-2">{module.title}</h3>
                <p className="text-dark-400 text-sm mb-4">{module.description}</p>
                <div className="flex items-center text-primary-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>立即体验</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-dark-100">最近项目</h2>
          <button className="text-primary-400 hover:text-primary-300 transition-colors text-sm font-medium">
            查看全部
          </button>
        </div>
        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
          {recentProjects.map((project) => (
            <div key={project.id} className="flex-shrink-0 w-64 rounded-2xl glassmorphism overflow-hidden hover:border-primary-500/50 transition-all duration-300">
              <div className="aspect-video bg-dark-800 relative overflow-hidden">
                <img
                  src={project.preview}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent"></div>
                <span className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium bg-dark-900/70 text-dark-300">
                  {project.type === 'image' ? '图像' : project.type === 'video' ? '视频' : project.type === 'audio' ? '音频' : '画布'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-dark-100 mb-1">{project.name}</h3>
                <p className="text-xs text-dark-400">今天 · 已完成</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
