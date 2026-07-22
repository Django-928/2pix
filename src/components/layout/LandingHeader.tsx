import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Headphones, Globe, ArrowRight, Menu, X, Film, Crown, Bot, User } from 'lucide-react';
import useSystemConfigStore from '@/store/useSystemConfigStore';

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const config = useSystemConfigStore((s) => s.config);

  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const navLinks = [
    { label: '工作台', icon: Bot, href: '/home', isRoute: true },
    { label: '漫剧', icon: Film, href: '/manju', isRoute: true },
    { label: '代理商', icon: Crown, href: '/agent', isRoute: true },
    { label: '个人中心', icon: User, href: '/profile', isRoute: true },
    { label: '支持', icon: Headphones, href: '#contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glassmorphism-dark py-3' : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] via-[#6366f1] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-black/20 transition-shadow">
              {config?.logoUrl ? (
                <img src={config.logoUrl} alt={config.platformName} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] rounded-xl blur-md opacity-20 -z-10 group-hover:opacity-40 transition-opacity"></div>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-none gradient-text">{config?.platformName || '2PIX'}</h1>
            <p className="text-[10px] text-dark-400 mt-0.5 tracking-wider">CREATIVE WORKSPACE</p>
          </div>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* 右侧操作 */}
        <div className="flex items-center gap-3">
          {/* 语言切换 */}
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'zh' ? '中' : 'EN'}</span>
          </button>

          {/* 开始使用 */}
          <Link
            to="/home"
            className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white text-sm font-medium button-glow"
          >
            进入工作台
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {mobileOpen && (
        <div className="md:hidden mt-3 mx-6 glassmorphism-dark rounded-2xl p-4 fade-in">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return link.isRoute ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </a>
              );
            })}
            <Link
              to="/home"
              className="flex items-center justify-center gap-1.5 mt-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white text-sm font-medium"
            >
              进入工作台
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
