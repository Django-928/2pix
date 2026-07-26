import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, LogOut, LayoutDashboard, RefreshCw, Mail, ExternalLink } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    nickname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    captchaId: '',
    captchaCode: '',
    agreedTerms: false,
    agreedPrivacy: false,
  });
  const [error, setError] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [activation, setActivation] = useState<{ show: boolean; message: string; url?: string } | null>(null);
  const navigate = useNavigate();
  const { register, isLogin, loading, logout, user } = useAuthStore();

  const updateForm = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleAgree = (key: 'agreedTerms' | 'agreedPrivacy') =>
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      if (!res.ok) throw new Error('获取验证码失败');
      const svg = await res.text();
      const id = res.headers.get('X-Captcha-Id') || '';
      setCaptchaSvg(svg);
      setForm((prev) => ({ ...prev, captchaId: id, captchaCode: '' }));
    } catch {
      setError('验证码加载失败，请刷新重试');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    if (!isLogin) {
      loadCaptcha();
    }
  }, [isLogin]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setActivation(null);

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (form.phone && !PHONE_REGEX.test(form.phone)) {
      setError('手机号格式不正确');
      return;
    }
    if (!form.agreedTerms || !form.agreedPrivacy) {
      setError('请阅读并同意《用户协议》和《隐私政策》');
      return;
    }
    if (!form.captchaCode || !form.captchaId) {
      setError('请输入图形验证码');
      return;
    }

    try {
      const result = await register({
        username: form.username,
        nickname: form.nickname || form.username,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        inviteCode: form.inviteCode || undefined,
        captchaId: form.captchaId,
        captchaCode: form.captchaCode,
        agreedTerms: form.agreedTerms,
        agreedPrivacy: form.agreedPrivacy,
      });
      if (result.requiresActivation) {
        setActivation({ show: true, message: result.message, url: result.activationUrl });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
      loadCaptcha();
    }
  };

  if (isLogin) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-5 relative overflow-hidden">
        <div className="absolute top-[-160px] right-[10%] w-[420px] h-[420px] rounded-full bg-[#8b5cf6]/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[8%] w-[460px] h-[460px] rounded-full bg-[#6366f1]/10 blur-3xl" />

        <section className="relative z-10 w-full max-w-xl rounded-3xl bg-[rgba(18,18,22,0.85)] border border-[rgba(255,255,255,0.06)] backdrop-blur-xl p-8 shadow-2xl shadow-black/40 text-center space-y-6 py-4">
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
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute top-[-160px] right-[10%] w-[420px] h-[420px] rounded-full bg-[#8b5cf6]/10 blur-3xl" />
      <div className="absolute bottom-[-180px] left-[8%] w-[460px] h-[460px] rounded-full bg-[#6366f1]/10 blur-3xl" />

      <section className="relative z-10 w-full max-w-xl rounded-3xl bg-[rgba(18,18,22,0.85)] border border-[rgba(255,255,255,0.06)] backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">创建 2PIX 账号</h1>
            <p className="text-sm text-[#777] mt-1">注册后即可进入工作台并拥有独立额度账户</p>
          </div>
        </div>

        {activation?.show ? (
          <div className="space-y-6 py-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <h2 className="font-display text-xl font-semibold text-white">注册成功</h2>
              <p className="text-sm text-[#bbb] mt-2">{activation.message}</p>
              <p className="text-sm text-[#777] mt-1">
                激活邮件已发送至 <span className="text-[#a78bfa]">{form.email}</span>，请点击邮件中的链接完成激活。
              </p>
            </div>
            {activation.url && (
              <div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 p-4 space-y-2">
                <p className="text-xs text-[#999]">当前未配置邮件服务器，可使用下方测试激活链接：</p>
                <a
                  href={activation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#a78bfa] hover:text-[#c4b5fd] break-all"
                >
                  {activation.url}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 shadow-lg shadow-[#8b5cf6]/20 transition-all"
            >
              前往登录
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#bbb] mb-2">用户名</label>
                  <input value={form.username} onChange={(e) => updateForm('username', e.target.value)} minLength={3} maxLength={20} className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" required />
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
                  <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} minLength={6} className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all" required />
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

              <div>
                <label className="block text-sm text-[#bbb] mb-2">图形验证码</label>
                <div className="flex gap-3">
                  <div className="shrink-0 h-[46px] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-white">
                    {captchaSvg ? (
                      <div dangerouslySetInnerHTML={{ __html: captchaSvg }} className="w-[120px] h-full" />
                    ) : (
                      <div className="w-[120px] h-full flex items-center justify-center text-xs text-[#999]">加载中</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    disabled={captchaLoading}
                    className="shrink-0 px-3 h-[46px] rounded-xl border border-white/[0.12] text-white/70 hover:bg-white/[0.05] hover:text-white transition-all disabled:opacity-50"
                    title="刷新验证码"
                  >
                    <RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <input
                    value={form.captchaCode}
                    onChange={(e) => updateForm('captchaCode', e.target.value)}
                    placeholder="输入验证码"
                    maxLength={10}
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] text-white outline-none focus:border-[#8b5cf6]/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_0_20px_rgba(139,92,246,0.08)] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.agreedTerms}
                    onChange={() => toggleAgree('agreedTerms')}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-[#0a0a0a] text-[#8b5cf6] focus:ring-[#8b5cf6]/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-[#999] leading-relaxed">
                    我已阅读并同意
                    <Link to="/terms" target="_blank" className="text-[#a78bfa] hover:text-[#c4b5fd] mx-0.5">《用户协议》</Link>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.agreedPrivacy}
                    onChange={() => toggleAgree('agreedPrivacy')}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-[#0a0a0a] text-[#8b5cf6] focus:ring-[#8b5cf6]/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-[#999] leading-relaxed">
                    我已阅读并同意
                    <Link to="/privacy" target="_blank" className="text-[#a78bfa] hover:text-[#c4b5fd] mx-0.5">《隐私政策》</Link>
                  </span>
                </label>
              </div>

              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

              <button
                disabled={loading || !form.username || !form.email || !form.password || !form.confirmPassword || !form.captchaCode || !form.agreedTerms || !form.agreedPrivacy}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#8b5cf6]/20 transition-all"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                注册账号
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
