import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sparkles, Shield, Zap, TrendingUp } from 'lucide-react';
import api from '@/utils/api';
import useAdminStore from '@/store/useAdminStore';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setToken, setUser, isLogin } = useAdminStore();

  useEffect(() => {
    if (isLogin) {
      navigate('/admin');
    }
  }, [isLogin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post<{
        token: string;
        user: {
          id: number;
          username: string;
          email: string;
          nickname: string;
          avatar: string;
          role_name: string;
          status: string;
          balance: number;
          permissions: string[];
        };
      }>('/auth/login', { username, password });

      setToken(data.token);
      setUser(data.user);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        <div className="hidden lg:block">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center mb-6 shadow-lg shadow-black/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-4xl font-bold gradient-text mb-4">2PIX 管理后台</h1>
            <p className="text-dark-400 text-lg">
              管理用户、积分、价格、日志与演示数据的运营控制台
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Shield, title: '权限清晰', desc: '角色、用户和状态集中管理' },
              { icon: Zap, title: '计费可演示', desc: '价格、余额和账单链路可用于产品展示' },
              { icon: TrendingUp, title: '日志可追踪', desc: '登录、注册和运营操作留下记录' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={22} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-100 mb-1">{item.title}</h3>
                    <p className="text-sm text-dark-400">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">管理后台</h1>
          </div>

          <h2 className="text-xl font-semibold text-dark-100 mb-6">欢迎回来</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                用户名 / 邮箱
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名或邮箱"
                className="w-full px-4 py-3 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 pr-12 bg-dark-900/50 border border-purple-500/20 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-purple-500/10 text-center">
            <p className="text-sm text-dark-400">
              还没有账号？{' '}
              <Link to="/" className="text-purple-400 hover:text-purple-300 transition-colors">
                返回首页
              </Link>
            </p>
          </div>

          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <p className="text-xs text-dark-500 mb-2">演示账号</p>
              <p className="text-sm text-dark-400">用户名: <span className="text-purple-400">admin</span> / 密码: <span className="text-purple-400">admin123456</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
