import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import LandingHeader from '@/components/layout/LandingHeader';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import type { ParamOption } from '@/components/layout/WorkspaceLayout';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminStore } from '@/store/useAdminStore';
import useAuthStore from '@/store/useAuthStore';
import useSystemConfigStore from '@/store/useSystemConfigStore';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SkeletonPage } from '@/components/ui/Skeleton';

const Home = lazy(() => import('@/pages/Home'));
const ImageGeneratorPage = lazy(() => import('@/pages/ImageGeneratorPage'));
const VideoGeneratorPage = lazy(() => import('@/pages/VideoGeneratorPage'));
const AudioGeneratorPage = lazy(() => import('@/pages/AudioGeneratorPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const CanvasPage = lazy(() => import('@/pages/CanvasPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const UnifiedWorkbenchPage = lazy(() => import('@/pages/UnifiedWorkbenchPage'));
const ManjuPage = lazy(() => import('@/pages/ManjuPage'));
const AgentCenterPage = lazy(() => import('@/pages/AgentCenterPage'));
const AuraPage = lazy(() => import('@/pages/AuraPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRolesPage = lazy(() => import('@/pages/admin/AdminRolesPage'));
const AdminLogsPage = lazy(() => import('@/pages/admin/AdminLogsPage'));
const AdminBillingPage = lazy(() => import('@/pages/admin/AdminBillingPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminPaymentCallbacksPage = lazy(() => import('@/pages/admin/AdminPaymentCallbacksPage'));
const AdminRefundsPage = lazy(() => import('@/pages/admin/AdminRefundsPage'));
const AdminModelUsagePage = lazy(() => import('@/pages/admin/AdminModelUsagePage'));
const AdminPricesPage = lazy(() => import('@/pages/admin/AdminPricesPage'));
const AdminMembershipPlansPage = lazy(() => import('@/pages/admin/AdminMembershipPlansPage'));
const AdminModelConfigsPage = lazy(() => import('@/pages/admin/AdminModelConfigsPage'));
const AdminPaymentConfigPage = lazy(() => import('@/pages/admin/AdminPaymentConfigPage'));
const AdminProviderConfigPage = lazy(() => import('@/pages/admin/AdminProviderConfigPage'));
const AdminSystemConfigPage = lazy(() => import('@/pages/admin/AdminSystemConfigPage'));
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage'));
const AdminWorksPage = lazy(() => import('@/pages/admin/AdminWorksPage'));
const AdminExportPage = lazy(() => import('@/pages/admin/AdminExportPage'));
const AdminBackupPage = lazy(() => import('@/pages/admin/AdminBackupPage'));
const AdminHealthPage = lazy(() => import('@/pages/admin/AdminHealthPage'));
const AdminProfitPage = lazy(() => import('@/pages/admin/AdminProfitPage'));
const AdminModelsPage = lazy(() => import('@/pages/admin/AdminModelsPage'));
const AdminRedeemCodesPage = lazy(() => import('@/pages/admin/AdminRedeemCodesPage'));
const AdminPricingPage = lazy(() => import('@/pages/admin/AdminPricingPage'));
const AgentListPage = lazy(() => import('@/pages/AgentListPage'));
const AgentRunPage = lazy(() => import('@/pages/AgentRunPage'));

function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-900">
      <LandingHeader />
      <main>{children}</main>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="min-h-screen bg-dark-900">
      <SkeletonPage />
    </div>
  );
}

function SystemBanner() {
  const config = useSystemConfigStore((s) => s.config);
  if (!config?.announcement) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-xl">
      {config.announcement}
    </div>
  );
}

function MaintenancePage() {
  const config = useSystemConfigStore((s) => s.config);
  return (
    <div className="min-h-screen bg-dark-900 text-dark-100 flex items-center justify-center px-6">
      <div className="max-w-xl rounded-3xl border border-purple-500/20 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/30">
        {config?.logoUrl ? (
          <img src={config.logoUrl} alt={config.platformName} className="mx-auto mb-5 h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-2xl font-bold text-purple-200">
            {(config?.platformName || '2PIX').slice(0, 1)}
          </div>
        )}
        <h1 className="text-2xl font-bold">{config?.platformName || '2PIX'} 正在维护</h1>
        <p className="mt-3 text-dark-400">
          系统正在进行维护升级，普通用户暂时无法访问创作功能。后台管理仍可正常登录。
        </p>
        {config?.announcement && (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {config.announcement}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoWorkspace() {
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [generateTrigger, setGenerateTrigger] = useState<{ text: string; id: number } | null>(null);

  const videoParams: ParamOption[] = [
    {
      id: 'style',
      label: '风格',
      value: 'cinematic',
      options: [
        { value: 'cinematic', label: '电影风格' },
        { value: 'realistic', label: '写实风格' },
        { value: 'anime', label: '动漫风格' },
        { value: 'abstract', label: '抽象风格' },
      ],
    },
    {
      id: 'resolution',
      label: '分辨率',
      value: '1080p',
      options: [
        { value: '720p', label: '720p HD' },
        { value: '1080p', label: '1080p FHD' },
        { value: '2k', label: '2K QHD' },
        { value: '4k', label: '4K UHD' },
      ],
    },
    {
      id: 'duration',
      label: '时长',
      value: '10',
      options: [
        { value: '5', label: '5秒' },
        { value: '10', label: '10秒' },
        { value: '15', label: '15秒' },
        { value: '30', label: '30秒' },
      ],
    },
  ];

  const handleSend = (text: string) => {
    setGenerateTrigger({ text, id: Date.now() });
  };

  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setReferenceImages((prev) => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <WorkspaceLayout
      modelName="Sora 2"
      modelIcon="🎬"
      modelDescription="OpenAI 最新视频生成模型，电影级画质，支持复杂场景与长视频生成。"
      params={videoParams}
      costDisplay="50 积分"
      inputPlaceholder="描述你想要生成的视频内容，例如：一只优雅的白鹭在清晨的湖面上飞过..."
      sendButtonText="生成视频"
      onSend={handleSend}
      showReferencePreview={true}
      referenceImages={referenceImages}
      onUploadImage={handleUploadImage}
      hideComposer={true}
    >
      <VideoGeneratorPage generateTrigger={generateTrigger} />
    </WorkspaceLayout>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLogin } = useAdminStore();
  if (!isLogin) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

function UserRoute({ children }: { children: React.ReactNode }) {
  const { isLogin, token, user, refreshMe } = useAuthStore();
  const { config, loadConfig } = useSystemConfigStore();

  useEffect(() => {
    if (token && !user) {
      refreshMe();
    }
  }, [token, user, refreshMe]);

  useEffect(() => {
    if (!config) {
      loadConfig();
    }
  }, [config, loadConfig]);

  if (!token && !isLogin) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  if (config?.maintenanceMode) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

export default function App() {
  const loadConfig = useSystemConfigStore((s) => s.loadConfig);
  const isLogin = useAuthStore((s) => s.isLogin);
  const loadProjects = useStore((s) => s.loadProjects);
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);

  // 应用启动时及 theme/language 变化时同步到 DOM
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.lang = language;
  }, [language]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (isLogin) {
      loadProjects().catch(() => undefined);
      useStore.getState().loadConversations().catch(() => undefined);
    }
  }, [isLogin, loadProjects]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <SystemBanner />
          <Suspense fallback={<PageFallback />}>
            <Routes>
          <Route path="/" element={<Home />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/home" element={<UserRoute><UnifiedWorkbenchPage /></UserRoute>} />

        <Route
          path="/image"
          element={
            <UserRoute>
              <WorkspaceLayout
                modelName="GPT Image 2"
                modelIcon="🟢"
                modelDescription="OpenAI 最新一代图像生成模型，语义理解与细节表现更强，支持文生图与图生图。"
                hideComposer={true}
              >
                <ImageGeneratorPage />
              </WorkspaceLayout>
            </UserRoute>
          }
        />

        <Route
          path="/video"
          element={<UserRoute><VideoWorkspace /></UserRoute>}
        />

        <Route
          path="/audio"
          element={
            <UserRoute>
              <WorkspaceLayout
                modelName="Suno V4.5"
                modelIcon="🎵"
                modelDescription="业界领先的 AI 音乐生成模型，支持多种风格，高质量作曲与演唱。"
                hideComposer={true}
              >
                <AudioGeneratorPage />
              </WorkspaceLayout>
            </UserRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <UserRoute>
              <WorkspaceLayout
                modelName="GPT-5.5"
                modelIcon="🟢"
                modelDescription="OpenAI 最新一代大语言模型，推理能力与创意表现全面提升。"
              >
                <ChatPage />
              </WorkspaceLayout>
            </UserRoute>
          }
        />

        <Route
          path="/canvas"
          element={
            <UserRoute>
              <WorkspaceLayout
                modelName="无限画布"
                modelIcon="🎨"
                modelDescription="无限扩展的数字画布，支持图像、视频、文本等多种元素的拖放与编辑。"
              >
                <CanvasPage />
              </WorkspaceLayout>
            </UserRoute>
          }
        />

        <Route path="/profile" element={<UserRoute><ProfilePage /></UserRoute>} />

        <Route path="/manju" element={<UserRoute><ManjuPage /></UserRoute>} />

        <Route path="/agent" element={<UserRoute><AgentCenterPage /></UserRoute>} />

        <Route path="/agents" element={<UserRoute><AgentListPage /></UserRoute>} />
        <Route path="/agents/:id" element={<UserRoute><AgentRunPage /></UserRoute>} />

        <Route path="/aura" element={<AuraPage />} />

        <Route path="/dashboard" element={<Navigate to="/home" replace />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboardPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminUsersPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminRolesPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminLogsPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminBillingPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminOrdersPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payment-callbacks"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminPaymentCallbacksPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/refunds"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminRefundsPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/works"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminWorksPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/model-usage"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminModelUsagePage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/models"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminModelsPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/prices"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminPricesPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/membership-plans"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminMembershipPlansPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/model-configs"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminModelConfigsPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payment-config"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminPaymentConfigPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/provider-config"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminProviderConfigPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminNotificationsPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/export"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminExportPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/redeem-codes"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminRedeemCodesPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/backup"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminBackupPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminHealthPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/profit"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminProfitPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/system-config"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminSystemConfigPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/pricing"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminPricingPage />
              </AdminLayout>
            </AdminRoute>
          }
        />
        </Routes>
      </Suspense>
    </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}
