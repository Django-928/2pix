import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  User,
  Code2,
  WalletCards,
  PlugZap,
  Lock,
  Download,
  Database,
  Activity,
  RotateCcw,
  TrendingUp,
  Ticket,
  Undo2,
  Crown,
} from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

const menuItems = [
  { id: 'dashboard', label: '数据概览', icon: LayoutDashboard, path: '/admin' },
  { id: 'users', label: '用户管理', icon: Users, path: '/admin/users', permission: 'user:view' },
  { id: 'roles', label: '角色权限', icon: Shield, path: '/admin/roles', permission: 'role:view' },
  { id: 'logs', label: '操作日志', icon: FileText, path: '/admin/logs', permission: 'log:view' },
  { id: 'billing', label: '计费账单', icon: CreditCard, path: '/admin/billing', permission: 'billing:view' },
  { id: 'model-usage', label: '模型调用', icon: Code2, path: '/admin/model-usage', permission: 'billing:view' },
  { id: 'models', label: '模型管理', icon: Database, permission: 'model:view', path: '/admin/models' },
  { id: 'orders', label: '订单管理', icon: WalletCards, path: '/admin/orders', permission: 'billing:manage' },
  { id: 'payment-callbacks', label: '支付回调', icon: RotateCcw, path: '/admin/payment-callbacks', permission: 'billing:manage' },
  { id: 'refunds', label: '退款管理', icon: Undo2, path: '/admin/refunds', permission: 'billing:manage' },
  { id: 'content', label: '内容作品', icon: FileText, path: '/admin/works', permission: 'work:review' },
  { id: 'prices', label: '价格管理', icon: Settings, path: '/admin/prices', permission: 'price:view' },
  { id: 'membership-plans', label: '充值套餐', icon: Crown, path: '/admin/membership-plans', permission: 'system:config' },
  { id: 'model-configs', label: '模型接口', icon: Code2, path: '/admin/model-configs', permission: 'system:config' },
  { id: 'payment-config', label: '支付配置', icon: WalletCards, path: '/admin/payment-config', permission: 'system:config' },
  { id: 'provider-config', label: '聚合平台', icon: PlugZap, path: '/admin/provider-config', permission: 'system:config' },
  { id: 'notifications', label: '通知公告', icon: Bell, path: '/admin/notifications', permission: 'notification:manage' },
  { id: 'export', label: '数据导出', icon: Download, path: '/admin/export', permission: 'export:data' },
  { id: 'redeem-codes', label: '兑换码', icon: Ticket, path: '/admin/redeem-codes', permission: 'system:config' },
  { id: 'backup', label: '数据备份', icon: Database, path: '/admin/backup', permission: 'backup:manage' },
  { id: 'health', label: '系统健康', icon: Activity, path: '/admin/health', permission: 'health:view' },
  { id: 'profit', label: '利润分析', icon: TrendingUp, path: '/admin/profit', permission: 'billing:view' },
  { id: 'system-config', label: '系统配置', icon: Settings, path: '/admin/system-config', permission: 'system:config' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const { user, isLogin, logout, hasPermission, initFromToken } = useAdminStore();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (!user && isLogin) {
      initFromToken();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResize = () => setCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd) return;
    if (newPwd.length < 6) { toast.warning('新密码长度不能少于6位'); return; }
    setPwdLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd });
      toast.success('密码修改成功');
      setShowPwdModal(false);
      setOldPwd('');
      setNewPwd('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || '修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const activeItem = menuItems.find((item) => {
    if (item.path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
  });

  const visibleMenuItems = menuItems.filter((item) =>
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* 移动端遮罩 */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full bg-dark-800/95 backdrop-blur-xl border-r border-purple-500/10 z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-60'
        } ${collapsed ? '' : 'shadow-2xl'}`}
      >
        <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-purple-500/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
                <span className="text-white font-bold text-sm">2P</span>
              </div>
              <span className="font-bold gradient-text">管理后台</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-purple-500/10 text-dark-400 hover:text-purple-400 transition-colors"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); if (window.innerWidth < 1024) setCollapsed(true); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/20'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <header className="h-16 bg-dark-800/80 backdrop-blur-xl border-b border-purple-500/10 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                placeholder="搜索..."
                className="w-64 pl-9 pr-4 py-2 bg-dark-900/50 border border-purple-500/10 rounded-xl text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:border-purple-500/30 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-xl hover:bg-purple-500/10 text-dark-400 hover:text-purple-400 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-purple-500/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-dark-200">{user?.nickname || user?.username || '管理员'}</p>
                  <p className="text-xs text-dark-500">{user?.role_name || '系统管理员'}</p>
                </div>
                <ChevronDown size={16} className="text-dark-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-purple-500/10 rounded-xl shadow-xl py-2 z-50">
                  <button
                    onClick={() => { setUserMenuOpen(false); setShowPwdModal(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-dark-300 hover:bg-purple-500/10 hover:text-purple-400 transition-colors flex items-center gap-2"
                  >
                    <Lock size={16} />
                    修改密码
                  </button>
                  <div className="mx-3 my-1 border-t border-purple-500/10" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      {showPwdModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-dark-800 border border-purple-500/20 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-dark-100">修改密码</h3>
              <button onClick={() => setShowPwdModal(false)} className="text-dark-400 hover:text-dark-200"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm text-dark-400 mb-1">当前密码</label>
              <input type="password" className="w-full px-3 py-2 bg-dark-900 border border-purple-500/20 rounded-xl text-dark-200 text-sm focus:outline-none focus:border-purple-500/40" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="输入当前密码" />
              <label className="block text-sm text-dark-400 mb-1">新密码</label>
              <input type="password" className="w-full px-3 py-2 bg-dark-900 border border-purple-500/20 rounded-xl text-dark-200 text-sm focus:outline-none focus:border-purple-500/40" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="至少6位" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPwdModal(false)} className="flex-1 px-4 py-2 bg-dark-700/50 text-dark-300 rounded-xl text-sm hover:bg-dark-700 transition-colors">取消</button>
              <button onClick={handleChangePassword} disabled={pwdLoading || !oldPwd || !newPwd} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-xl text-sm hover:bg-purple-600 transition-colors disabled:opacity-50">{pwdLoading ? '保存中...' : '确认修改'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
