import { Bell, Search, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 glassmorphism border-b border-primary-600/30 flex items-center justify-between px-6 z-40">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          placeholder="搜索功能、模型或项目..."
          className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-dark-900/50 border border-primary-600/30 text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2.5 rounded-xl text-dark-300 hover:bg-primary-900/30 hover:text-white transition-all duration-300">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button className="flex items-center gap-3 px-4 py-2 rounded-xl glassmorphism-light hover:bg-primary-900/30 transition-all duration-300">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-dark-100">创作者</p>
            <p className="text-xs text-dark-400">普通用户</p>
          </div>
        </button>
      </div>
    </header>
  );
}
