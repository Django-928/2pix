import { Link, useLocation } from 'react-router-dom';
import { Bot, Crown, Film, Home, Settings, User } from 'lucide-react';

const links = [
  { label: '工作台', href: '/home', icon: Bot },
  { label: '个人中心', href: '/profile', icon: User },
  { label: '漫剧', href: '/manju', icon: Film },
  { label: '代理商', href: '/agent', icon: Crown },
  { label: '后台配置', href: '/admin/provider-config', icon: Settings },
];

export default function AppQuickNav({ compact = false }: { compact?: boolean }) {
  const location = useLocation();

  return (
    <nav className={`flex items-center gap-1 overflow-x-auto ${compact ? 'max-w-full' : ''}`}>
      <Link
        to="/"
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#888] hover:text-white hover:bg-white/[0.06] transition-all"
      >
        <Home className="w-3.5 h-3.5" />
        <span className={compact ? 'hidden sm:inline' : ''}>首页</span>
      </Link>
      {links.map((link) => {
        const Icon = link.icon;
        const active = location.pathname === link.href || (link.href === '/home' && location.pathname === '/dashboard');
        return (
          <Link
            key={link.href}
            to={link.href}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all ${
              active
                ? 'bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/20'
                : 'text-[#888] hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className={compact ? 'hidden sm:inline' : ''}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
