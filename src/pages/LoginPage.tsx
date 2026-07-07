import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ChevronRight, LogOut, LayoutDashboard } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';

function LogoMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLogin, loading, logout, user } = useAuthStore();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/home';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-5 relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, #0b1d3a 0%, #05080f 60%, #000000 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[rgba(12,12,12,0.35)]" />
      </div>

      {/* Soft color orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute rounded-full blur-[100px] opacity-30"
          style={{
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(0,210,255,0.35), transparent 70%)',
            top: '-5%',
            left: '10%',
          }}
        />
        <div
          className="absolute rounded-full blur-[100px] opacity-25"
          style={{
            width: 350,
            height: 350,
            background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)',
            bottom: '-5%',
            right: '10%',
          }}
        />
      </div>

      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02] z-0"
        style={{
          backgroundSize: '60px 60px',
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
        <section className="hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <LogoMark className="w-10 h-10 text-white" />
            <span className="text-2xl font-semibold tracking-tight">2Pix AI</span>
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight mb-6 leading-tight">
            登录 2Pix AI
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-md">
            使用你的账号进入 AI 创作工作台，查看额度、作品、项目和生成记录。
          </p>
        </section>

        <section className="rounded-3xl border border-white/[0.08] p-8 shadow-2xl shadow-black/40"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)',
          }}
        >
          {isLogin ? (
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <LayoutDashboard className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">你已登录</h2>
                <p className="text-sm text-white/50 mt-2">
                  当前账号：{user?.nickname || user?.username || '未知用户'}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(redirectTo)}
                  className="group w-full h-12 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-white/10 transition-all"
                >
                  <span>进入工作台</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[2px]" />
                </button>
                <button
                  onClick={logout}
                  className="w-full h-12 rounded-full border border-white/[0.12] text-white/80 font-medium hover:bg-white/[0.05] hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
              <Link
                to="/"
                className="block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                返回首页
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-display text-2xl font-semibold">欢迎回来</h2>
                <p className="text-sm text-white/50 mt-2">支持用户名、邮箱或手机号登录</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-white/70 mb-2">账号</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="用户名 / 邮箱 / 手机号"
                    className="w-full px-4 py-3 rounded-xl bg-black/25 border border-white/[0.08] text-white placeholder-white/35 outline-none focus:border-cyan-400/40 focus:bg-white/[0.04] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-black/25 border border-white/[0.08] text-white placeholder-white/35 outline-none focus:border-cyan-400/40 focus:bg-white/[0.04] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  disabled={loading || !username || !password}
                  className="group w-full h-12 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-white/10 transition-all"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>登录</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[2px]" />
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-white/50">
                还没有账号？{' '}
                <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  立即注册
                </Link>
              </div>
              <Link
                to="/"
                className="mt-4 block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                返回首页
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
