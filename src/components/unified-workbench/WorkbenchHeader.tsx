import { Link } from 'react-router-dom';
import { Zap, Sun, Moon, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface NavItem {
  id: string;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  { id: 'workbench', label: '工作台', to: '/home' },
  { id: 'manju', label: '漫剧', to: '/manju' },
  { id: 'agent', label: '智能体', to: '/agents' },
  { id: 'profile', label: '个人中心', to: '/profile' },
];

interface WorkbenchHeaderProps {
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
  displayBalance: number;
  displayName: string;
  avatarUrl?: string;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

export function WorkbenchHeader({
  theme,
  language,
  displayBalance,
  displayName,
  avatarUrl,
  onToggleTheme,
  onToggleLanguage,
}: WorkbenchHeaderProps) {
  const toast = useToast();
  const avatarText = displayName.slice(0, 1).toUpperCase();

  const handleToggleLanguage = () => {
    onToggleLanguage();
    toast.success(language === 'zh' ? 'Switched to English' : '已切换为中文');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 px-6 grid grid-cols-[auto_1fr_auto] items-center bg-white/[0.025] backdrop-blur-xl border-b border-white/[0.06]">
      <Link to="/home" className="flex items-center gap-3 justify-self-start">
        <svg className="w-8 h-8 text-white" viewBox="0 0 256 256" fill="currentColor">
          <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
        </svg>
        <span className="text-lg font-semibold tracking-tight text-white">2Pix AI</span>
      </Link>

      <nav className="hidden md:flex items-center gap-1 justify-self-center bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-full px-1 py-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              item.id === 'workbench'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04]">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white">
            {Number(displayBalance || 0).toLocaleString()}
          </span>
          <Link
            to="/profile"
            className="ml-1 text-xs px-2.5 py-0.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition"
          >
            充值
          </Link>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/70 hover:bg-white/10 transition"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleToggleLanguage}
          className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/70 hover:bg-white/10 transition"
          title={language === 'zh' ? 'Switch to English' : '切换到中文'}
        >
          <Globe className="w-4 h-4" />
        </button>

        <Link
          to="/profile"
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              loading="lazy"
              decoding="async"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
              {avatarText}
            </div>
          )}
          <span className="text-sm hidden xl:block text-white/90">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
