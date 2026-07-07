import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, LogOut, LayoutDashboard } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    nickname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register, isLogin, loading, logout, user } = useAuthStore();

  const updateForm = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    try {
      await register({
        username: form.username,
        nickname: form.nickname || form.username,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        inviteCode: form.inviteCode || undefined,
      });
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute top-[-160px] right-[10%] w-[420px] h-[420px] rounded-full bg-[#8b5cf6]/10 blur-3xl" />
      <div className="absolute bottom-[-180px] left-[8%] w-[460px] h-[460px] rounded-full bg-[#6366f1]/10 blur-3xl" />

      <section className="relative z-10 w-full max-w-xl rounded-3xl bg-[rgba(18,18,22,0.85)] border border-[rgba(255,255,255,0.06)] backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
        {isLogin ? (
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
              <LayoutDashboard className="w-7 h-7 text-[#a78bfa]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-white">你已登录</h1>
              <p className="text-sm text-[#777] mt-2">
                当前账号：{user?.nickname || user?.username || '未知用户'}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/home')}
                className="group w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 shadow-lg shadow-[#8b5cf6]/20 transition-all"
              >
                <span>进入工作台</span>
                <Loader2 className="hidden w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="w-full h-12 rounded-xl border border-white/[0.12] text-white/80 font-medium hover:bg-white/[0.05] hover:text-white flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>退出登录</span>
              </button>
            </div>
            <div className="text-center text-sm text-[#777]">
              想换账号？ <Link to="/login" className="text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">去登录页</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-7">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold">创建 2PIX 账号</h1>
                <p className="text-sm text-[#777] mt-1">注册后即可进入工作台并拥有独立额度账户</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#bbb] mb-2">用户名</label>
                  <input value={form.username} onChange={(e) => updateForm('username', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" required />
                </div>
                <div>
                  <label className="block text-sm text-[#bbb] mb-2">昵称</label>
                  <input value={form.nickname} onChange={(e) => updateForm('nickname', e.target.value)} placeholder="可选" className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#bbb] mb-2">邮箱</label>
                <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" required />
              </div>

              <div>
                <label className="block text-sm text-[#bbb] mb-2">手机号</label>
                <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="可选，后续可用于找回账号" className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#bbb] mb-2">密码</label>
                  <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" required />
                </div>
                <div>
                  <label className="block text-sm text-[#bbb] mb-2">确认密码</label>
                  <input type="password" value={form.confirmPassword} onChange={(e) => updateForm('confirmPassword', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" required />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#bbb] mb-2">邀请码（可选）</label>
                <input value={form.inviteCode} onChange={(e) => updateForm('inviteCode', e.target.value)} placeholder="填写邀请人用户名，双方均可获得奖励" className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" />
              </div>

              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

              <button
                disabled={loading || !form.username || !form.email || !form.password || !form.confirmPassword}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#8b5cf6]/20 transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                注册并进入工作台
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#777]">
              已有账号？ <Link to="/login" className="text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">去登录</Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
