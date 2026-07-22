import { useState, ReactNode, useEffect, useRef } from 'react';
import {
  ListChecks,
  Lightbulb,
  UserPlus,
  Pencil,
  X,
  Search,
  FileSearch,
  Send,
  ImagePlus,
  Mic,
  Settings,
  Sparkles,
  Clock,
  Sun,
  Languages,
  Gift,
  Headphones,
  Bell,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Code2,
  Image,
  Building2,
  Megaphone,
  ExternalLink,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useToast } from '@/components/ui/Toast';

export interface ParamOption {
  id: string;
  label: string;
  value: string;
  options?: { value: string; label: string }[];
}

export interface WorkspaceLayoutProps {
  children: ReactNode;
  modelName?: string;
  modelIcon?: string;
  modelDescription?: string;
  referenceImages?: string[];
  params?: ParamOption[];
  costDisplay?: string;
  inputPlaceholder?: string;
  sendButtonText?: string;
  onSend?: (text: string) => void;
  showRoleStrip?: boolean;
  showReferencePreview?: boolean;
  onUploadImage?: () => void;
  hideComposer?: boolean;
}

export default function WorkspaceLayout({
  children,
  modelName = 'GPT Image 2',
  modelIcon = '🟢',
  modelDescription = 'OpenAI 最新一代图像生成模型，语义理解与细节表现更强，支持文生图与图生图。',
  referenceImages = [],
  params = [],
  costDisplay,
  inputPlaceholder = '描述你想要生成的内容...',
  sendButtonText = '生成',
  onSend,
  showRoleStrip = false,
  showReferencePreview = false,
  onUploadImage,
  hideComposer = false,
}: WorkspaceLayoutProps) {
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeUtility, setActiveUtility] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const projects = useStore((state) => state.projects);
  const {
    theme,
    language,
    demoCredits,
    checkedInDate,
    toggleTheme,
    toggleLanguage,
    checkIn,
    modelApiConfigs,
  } = useSettingsStore();
  const toast = useToast();
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    params.forEach((p) => {
      initial[p.id] = p.value;
    });
    return initial;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  const isEnglish = language === 'en';
  const today = new Date().toISOString().slice(0, 10);
  const signedToday = checkedInDate === today;

  const uiText = {
    taskList: isEnglish ? 'Tasks' : '任务列表',
    currentModel: isEnglish ? 'Current model' : '当前模型',
    taskSearch: isEnglish ? 'Search by prompt' : '按提示词搜索任务',
    noTask: isEnglish ? 'No tasks yet. Generate one first.' : '暂无任务，先生成一个作品',
    noMatchedTask: isEnglish ? 'No matching task' : '没有匹配的任务',
    shown: isEnglish ? 'shown' : '已展示',
    items: isEnglish ? 'items' : '条',
    interface: isEnglish ? 'Interface' : '界面设置',
    rewards: isEnglish ? 'Rewards' : '奖励活动',
    support: isEnglish ? 'Support' : '服务支持',
    platform: isEnglish ? 'Platform' : '平台工具',
    theme: theme === 'dark' ? (isEnglish ? 'Light mode' : '切换浅色') : (isEnglish ? 'Dark mode' : '切换深色'),
    themeDesc: isEnglish ? 'Switch display mode' : '切换当前显示模式',
    language: isEnglish ? '中文' : 'English',
    languageDesc: isEnglish ? 'Switch interface language' : '切换界面显示语言',
    settingsCenter: isEnglish ? 'Settings center' : '设置中心',
    settingsDesc: isEnglish ? 'Preferences and account settings' : '偏好与账号设置',
    dailyCheckIn: isEnglish ? 'Daily check-in' : '每日签到',
    checkInDesc: signedToday ? (isEnglish ? 'Reward claimed today' : '今日奖励已领取') : (isEnglish ? 'Claim today’s coins' : '领取今日金币奖励'),
    customer: isEnglish ? 'Customer service' : '联系客服',
    messages: isEnglish ? 'Messages' : '站内消息',
    complaint: isEnglish ? 'Complaint' : '客服投诉',
    feedback: isEnglish ? 'Feedback' : '意见反馈',
    pricing: isEnglish ? 'Pricing' : '价格查询',
    apiDocs: isEnglish ? 'API docs' : 'API 文档',
    assets: isEnglish ? 'Asset library' : '全局资产库',
    agency: isEnglish ? 'Agency program' : '加盟代理商',
    announcement: isEnglish ? 'Announcements' : '系统公告',
    completed: isEnglish ? 'Done' : '已完成',
    view: isEnglish ? 'View' : '查看',
  };

  const utilityContent: Record<string, { title: string; desc: string; body: ReactNode }> = {
    checkin: {
      title: uiText.dailyCheckIn,
      desc: signedToday
        ? (isEnglish ? 'Daily reward claimed. Keep the streak tomorrow.' : '今日奖励已领取，明天继续连签。')
        : (isEnglish ? 'Daily check-in with streak and milestone rewards.' : '每日签到，连续/累计双奖励。'),
      body: (
        <div className="utility-checkin">
          <div className="utility-stats-row">
            <div><strong>{signedToday ? 1 : 0}天</strong><span>连续签到</span></div>
            <div><strong>{signedToday ? 1 : 0}天</strong><span>累计签到</span></div>
            <div><strong>+80</strong><span>今日奖励</span></div>
          </div>
          <div className="utility-milestones">
            {[7, 15, 30].map((day) => (
              <span key={day}><b>{day}</b>{day === 7 ? '连签一周' : day === 15 ? '半月坚持' : '满月达人'}<em>+{day === 7 ? 1 : day === 15 ? 3 : 5} 倍</em></span>
            ))}
          </div>
          <div className="utility-calendar">
            {Array.from({ length: 31 }, (_, index) => (
              <span key={index} className={index + 1 === Number(today.slice(-2)) ? 'today' : index < 2 ? 'signed' : ''}>{index + 1}</span>
            ))}
          </div>
          <button type="button" className="utility-primary-action" onClick={checkIn}>
            {signedToday ? '今日已签到' : '立即签到 +80'}
          </button>
          <p className="utility-note">当前演示积分：{demoCredits}，参考站为金币/额度奖励，这里先用本地积分模拟。</p>
        </div>
      ),
    },
    settings: {
      title: uiText.settingsCenter,
      desc: isEnglish ? 'Manage display, language and demo account preferences.' : '管理显示、语言和演示账号偏好。',
      body: (
        <div className="utility-preference-grid">
          <div>
            <span>{isEnglish ? 'Theme' : '主题'}</span>
            <strong>{theme === 'dark' ? (isEnglish ? 'Dark' : '深色') : (isEnglish ? 'Light' : '浅色')}</strong>
          </div>
          <div>
            <span>{isEnglish ? 'Language' : '语言'}</span>
            <strong>{isEnglish ? 'English' : '中文'}</strong>
          </div>
          <div>
            <span>{isEnglish ? 'Demo credits' : '演示积分'}</span>
            <strong>{demoCredits}</strong>
          </div>
          <div>
            <span>{isEnglish ? 'Model configs' : '模型接口配置'}</span>
            <strong>{modelApiConfigs.length}</strong>
          </div>
        </div>
      ),
    },
    customer: {
      title: uiText.customer,
      desc: isEnglish ? 'Robot + human support entrance.' : '智能机器人 + 人工客服 · 全天候在线。',
      body: (
        <div className="utility-service-card">
          <div className="utility-qr">2P</div>
          <div>
            <strong>24小时在线客服</strong>
            <span>微信扫码咨询 / 在线客服组件占位</span>
            <button type="button" className="utility-primary-action">一键联系在线客服</button>
          </div>
        </div>
      ),
    },
    messages: {
      title: uiText.messages,
      desc: isEnglish ? 'Account notifications.' : '账户通知与系统消息。',
      body: (
        <div>
          <div className="utility-tabs">{['全部', '资金', '资源包', '账号', '反馈'].map((tab) => <button key={tab} type="button">{tab}</button>)}</div>
          <div className="utility-empty-state">
            <Bell size={26} />
            <strong>暂无站内消息</strong>
            <span>资金、资源包、账号、安全和反馈通知都会汇总到这里。</span>
          </div>
        </div>
      ),
    },
    complaint: {
      title: uiText.complaint,
      desc: isEnglish ? 'Submit a service complaint.' : '提交客服投诉。',
      body: (
        <div className="utility-form-grid">
          <label><span>问题类型</span><select><option>违规接待</option><option>诱导私下交易</option><option>承诺不实</option><option>其他问题</option></select></label>
          <label><span>投诉内容</span><textarea className="utility-textarea" placeholder="请尽量写清时间、沟通方式、对方承诺或违规行为，至少 10 个字。" /></label>
          <label><span>联系方式（选填）</span><input placeholder="手机 / 微信 / 邮箱，方便反馈处理结果" /></label>
          <div className="utility-upload-box">添加截图 · 最多 6 张，可直接粘贴截图</div>
        </div>
      ),
    },
    feedback: {
      title: uiText.feedback,
      desc: isEnglish ? 'Submit bugs and suggestions.' : '提交 BUG 与产品建议。',
      body: (
        <div className="utility-form-grid">
          <div className="utility-tabs"><button type="button">提交反馈</button><button type="button">历史记录</button></div>
          <label><span>标题 *</span><input maxLength={50} placeholder="请输入反馈标题（最多50个字符）" /></label>
          <label><span>描述</span><textarea className="utility-textarea" placeholder="请详细描述您的问题或建议（最多800个字符）" /></label>
          <div className="utility-upload-box">添加图片 · 最多 9 张</div>
        </div>
      ),
    },
    pricing: {
      title: uiText.pricing,
      desc: isEnglish ? 'Demo model pricing from admin configuration.' : '来自后台配置的演示模型价格。',
      body: (
        <div>
          <div className="utility-search-line"><Search size={15} /><input placeholder="搜索模型名称..." /></div>
          <div className="utility-tabs">{['全部', '视频', '图片', '聊天', '音频'].map((tab) => <button key={tab} type="button">{tab}</button>)}</div>
          <div className="utility-list">
            {modelApiConfigs.slice(0, 8).map((config) => (
              <span key={config.id}>
                <strong>{config.name}</strong>
                <em>{config.price} · 成功率 {config.successRate}%</em>
              </span>
            ))}
          </div>
        </div>
      ),
    },
    api: {
      title: uiText.apiDocs,
      desc: isEnglish ? 'API integration placeholder.' : '接口接入说明占位。',
      body: (
        <pre className="utility-code">{`POST /api/model/run
Authorization: Bearer <API_KEY>
{
  "model": "{{officialModel}}",
  "prompt": "{{prompt}}",
  "params": {}
}`}</pre>
      ),
    },
    assets: {
      title: uiText.assets,
      desc: isEnglish ? 'Reusable creative assets.' : '管理与复用创作素材。',
      body: (
        <div>
          <div className="utility-toolbar">
            <button type="button">+ 上传图片</button>
            <button type="button">+ 新建文本</button>
          </div>
          <div className="utility-tabs">{['全部', '角色', '场景', '道具', '音频', '视频', '文档', '文本'].map((tab) => <button key={tab} type="button">{tab}</button>)}</div>
          <p className="utility-note">附件类（图片/音频/视频/文档）仅保留 30 天，文本类资产不受影响。</p>
          <div className="utility-list">
            <span>咖啡馆雨夜分镜 <em>文本</em></span>
            <span>角色设定图 A <em>角色</em></span>
            <span>产品展示原片 <em>视频</em></span>
          </div>
        </div>
      ),
    },
    agency: {
      title: uiText.agency,
      desc: isEnglish ? 'Agency and partner program.' : '代理商与合作伙伴入口。',
      body: (
        <div className="utility-agency">
          <h3>开启 2PIX 合作伙伴计划</h3>
          {['你的品牌你做主：支持替换品牌名、Logo、客服入口。', '拿货价更低：可在后台配置阶梯成本与代理折扣。', '定价随你：销售价格、套餐权益、渠道佣金可独立配置。', '技术我们搞定：模型、任务队列、素材库、计费与更新保持同步。'].map((item) => <p key={item}>{item}</p>)}
          <div className="utility-stats-row"><div><strong>0+</strong><span>合作伙伴</span></div><div><strong>0%</strong><span>客户满意度</span></div><div><strong>0+</strong><span>累计服务用户</span></div></div>
        </div>
      ),
    },
    announcement: {
      title: uiText.announcement,
      desc: isEnglish ? 'Latest product updates.' : '最新产品更新。',
      body: (
        <div className="utility-announcement">
          <p className="utility-note">发布时间：2026-07-02 02:21:24</p>
          <h3>Sora 2 官转版通道恢复，团队账号能力上线</h3>
          <p>参考站公告采用长文弹窗，包含“最新/上一条/下一条”导航、功能亮点卡片与运营文案。这里保留同样的信息密度和结构。</p>
          <div className="utility-list">
            <span>Sora-2 官转版：新通道到位、货量充足、官方能力不缩水。<em>视频</em></span>
            <span>企业版团队账号：主账号统一充值、子账号独立记录、权限分级。<em>团队</em></span>
            <span>视频工作台：模型接口配置、任务列表、资产库和扫码上传继续增强。<em>更新</em></span>
          </div>
          <div className="utility-toolbar"><button type="button">上一条</button><button type="button">最新</button><button type="button">下一条</button></div>
        </div>
      ),
    },
  };

  const openUtility = (key: string) => {
    setActiveUtility(key);
    setSettingsOpen(false);
  };

  const handleCheckIn = () => {
    checkIn();
    openUtility('checkin');
  };

  const roles = [
    { id: 1, name: '角色1', avatar: 'https://cos.lingkeai.vip/DS.png?imageMogr2/thumbnail/100x100^/gravity/center/crop/100x100/quality/80/format/webp' },
    { id: 2, name: '角色2', avatar: 'https://cos.lingkeai.vip/uploads/2025.12/25/20251225234225_18847faf5fac5960.png?imageMogr2/thumbnail/100x100^/gravity/center/crop/100x100/quality/80/format/webp' },
    { id: 3, name: '角色3', avatar: 'https://cos.lingkeai.vip/uploads/2026.04/12/20260412204934_18a59cee096f77bcf149.png?imageMogr2/thumbnail/100x100^/gravity/center/crop/100x100/quality/80/format/webp' },
    { id: 4, name: '角色4', avatar: 'https://cos.lingkeai.vip/uploads/2026.04/12/20260412204934_18a59cee277eaa0c20ce.png?imageMogr2/thumbnail/100x100^/gravity/center/crop/100x100/quality/80/format/webp' },
    { id: 5, name: '角色5', avatar: 'https://cos.lingkeai.vip/uploads/2026.04/12/20260412204934_18a59cee096f77bcf149.png?imageMogr2/thumbnail/100x100^/gravity/center/crop/100x100/quality/80/format/webp' },
  ];

  const ActionMenuIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="8.5" height="8.5" rx="2.2" fill="#00CAE0"/>
      <rect x="15.5" y="4" width="8.5" height="8.5" rx="2.2" fill="#A855F7"/>
      <rect x="4" y="15.5" width="8.5" height="8.5" rx="2.2" fill="#F59E0B"/>
      <rect x="15.5" y="15.5" width="8.5" height="8.5" rx="2.2" fill="#10B981"/>
    </svg>
  );

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSend?.(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredProjects = projects.filter((project) => {
    const keyword = taskSearch.trim().toLowerCase();
    if (!keyword) return true;
    return (
      project.name.toLowerCase().includes(keyword) ||
      project.type.toLowerCase().includes(keyword) ||
      JSON.stringify(project.inputParams).toLowerCase().includes(keyword)
    );
  });

  const projectTypeLabel: Record<string, string> = {
    image: '图像',
    video: '视频',
    audio: '音频',
    chat: '对话',
  };

  return (
    <div className="home-container">
      <div className="mobile-sidebar-mask"></div>
      <Sidebar />

      <main className="main-content">
        <div className="model-workspace">
          {/* 左上角操作 */}
          <div className="top-left-actions">
            <button
              type="button"
              className="task-list-entry"
              title="任务列表"
              aria-label="任务列表"
              onClick={() => setTaskPanelOpen(true)}
            >
              <ListChecks size={16} />
              <span>{uiText.taskList}</span>
            </button>
            <button
              type="button"
              className="wanfa-btn"
              title="看看怎么玩（玩法说明）"
              aria-label="看看怎么玩（玩法说明）"
            >
              <Lightbulb size={16} className="wanfa-btn-icon" />
            </button>
          </div>

          {/* 任务列表面板 */}
          <div className={`task-dialog-panel ${taskPanelOpen ? 'open' : ''}`}>
            <div className="task-dialog-header">
              <div>
                <div className="task-dialog-kicker">{uiText.currentModel}</div>
                <h2 className="task-dialog-title">{uiText.taskList}</h2>
              </div>
              <button
                type="button"
                className="task-dialog-close"
                aria-label="关闭任务列表"
                onClick={() => setTaskPanelOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="task-dialog-toolbar">
              <div className="task-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder={uiText.taskSearch}
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="task-dialog-meta">
              <span>{modelName}</span>
              <span>{uiText.shown} {filteredProjects.length} {uiText.items}</span>
            </div>
            <div className="task-list-scroll">
              {filteredProjects.length > 0 ? (
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <article key={project.id} className="task-result-card">
                      <div className="task-result-top">
                        <span className={`task-result-type task-result-type-${project.type}`}>
                          {projectTypeLabel[project.type] || project.type}
                        </span>
                        <span className="task-result-time">
                          <Clock size={12} />
                          {new Date(project.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="task-result-title">{project.name}</h3>
                      <p className="task-result-desc">
                        {typeof project.inputParams?.prompt === 'string'
                          ? project.inputParams.prompt
                          : '演示任务已完成，可继续生成更多作品。'}
                      </p>
                      <div className="task-result-footer">
                        <span className={`task-result-status task-result-status-${project.status}`}>
                          {project.status === 'complete' ? uiText.completed : project.status}
                        </span>
                        {project.outputUrl && (
                          <button
                            type="button"
                            className="task-result-link"
                            onClick={() => window.open(project.outputUrl, '_blank')}
                          >
                            {uiText.view}
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="task-state-card">
                  <FileSearch size={28} />
                  <span>{taskSearch ? uiText.noMatchedTask : uiText.noTask}</span>
                </div>
              )}
            </div>
          </div>

          {/* 左下角模式操作 */}
          <div className="bottom-left-mode-actions">
            <button
              type="button"
              className="mode-action-button role-manage-button"
              aria-label="角色管理"
            >
              <UserPlus size={14} />
            </button>
            <button
              type="button"
              className="mode-action-button edit-image-button"
              aria-label="编辑图片"
            >
              <Pencil size={14} />
            </button>
          </div>

          {/* 顶部模型信息 */}
          <div className="top-model-info">
            <div className="tubiao-container">
              <div className="icon-wrapper pulse-glow">
                <div
                  style={{
                    fontSize: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {modelIcon}
                </div>
              </div>
              <div className="detail-text">{modelDescription}</div>
            </div>
          </div>

          {/* 中央滚动内容区 */}
          <div className="scroll-container">
            <div className="scroll-content">{children}</div>
          </div>

          {/* 底部输入区 */}
          {!hideComposer && <div className="bottom-input-wrapper">
            {/* 角色条 */}
            {showRoleStrip && (
              <div className="role-strip-outer">
                <div className="role-strip-scroll">
                  {roles.map((role) => (
                    <div key={role.id} className="role-strip-item">
                      <div className="role-strip-avatar-wrap">
                        <img
                          src={role.avatar}
                          alt={role.name}
                          loading="lazy"
                          decoding="async"
                          className="role-strip-avatar"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23a855f7" stroke-width="1.5"%3E%3Ccircle cx="12" cy="8" r="4"/%3E%3Cpath d="M4 21a8 8 0 0 1 16 0"/%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 输入框主体 */}
            <div className="input-box">
              <div className="flex gap-3 items-start">
                {/* 参考图预览 */}
                {showReferencePreview && referenceImages.length > 0 && (
                  <div className="flex gap-2 flex-shrink-0">
                    {referenceImages.map((img) => (
                      <div
                        key={img}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-purple-500/30 bg-dark-800"
                      >
                        <img src={img} alt="参考图" className="w-full h-full object-cover" />
                        <button className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 上传按钮 + 输入框 */}
                <div className="flex-1">
                  <textarea
                    className="input-textarea"
                    placeholder={inputPlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                  />
                </div>

                {/* 右侧操作 */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    type="button"
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                  >
                    <Send size={14} />
                    <span>{sendButtonText}</span>
                  </button>
                  {costDisplay && (
                    <div className="text-right text-xs text-dark-400 flex items-center justify-end gap-1">
                      <Sparkles size={10} />
                      <span>预计 {costDisplay}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 底部操作 + 参数 */}
              <div className="input-actions">
                <div className="input-actions-left">
                  <button type="button" className="input-action-btn" title="上传图片" onClick={onUploadImage}>
                    <ImagePlus size={16} />
                  </button>
                  <button type="button" className="input-action-btn" title="语音输入">
                    <Mic size={16} />
                  </button>
                  <button type="button" className="input-action-btn" title="设置">
                    <Settings size={16} />
                  </button>
                </div>

                {/* 参数选项栏 */}
                {params.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {params.map((param) => (
                      <div key={param.id} className="param-dropdown">
                        <select
                          value={paramValues[param.id] || param.value}
                          onChange={(e) =>
                            setParamValues((prev) => ({ ...prev, [param.id]: e.target.value }))
                          }
                          className="param-select"
                          style={{
                            background: 'rgba(30, 27, 46, 0.6)',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            borderRadius: '8px',
                            padding: '6px 28px 6px 12px',
                            fontSize: '12px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLSelectElement).style.borderColor = 'rgba(168, 85, 247, 0.4)';
                            (e.target as HTMLSelectElement).style.color = '#c084fc';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLSelectElement).style.borderColor = 'rgba(168, 85, 247, 0.2)';
                            (e.target as HTMLSelectElement).style.color = '#94a3b8';
                          }}
                        >
                          {param.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>}
        </div>
      </main>

      {/* 右侧悬浮按钮组 */}
      <div className="right-action-buttons-group" ref={settingsRef}>
        <button
          type="button"
          className="action-menu-trigger"
          aria-expanded={settingsOpen}
          aria-label="更多操作"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <span className="trigger-halo"></span>
          <span className="trigger-icon-wrap">
            <ActionMenuIcon />
          </span>
        </button>

        {/* 设置面板 */}
        {settingsOpen && (
          <div className="settings-panel glass-dark">
            {/* 界面设置 */}
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-indicator settings-indicator-purple"></span>
                <span className="settings-section-title">{uiText.interface}</span>
                <span className="settings-section-subtitle">INTERFACE</span>
              </div>
              <div className="settings-grid">
                <button type="button" className="settings-item" onClick={toggleTheme}>
                  <div className="settings-item-icon bg-amber-500/20 text-amber-400">
                    <Sun size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.theme}</span>
                    <span className="settings-item-desc">{uiText.themeDesc}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => {
                  toggleLanguage();
                  toast.success(language === 'zh' ? 'Switched to English' : '已切换为中文');
                }}>
                  <div className="settings-item-icon bg-violet-500/20 text-violet-400">
                    <Languages size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.language}</span>
                    <span className="settings-item-desc">{uiText.languageDesc}</span>
                  </div>
                </button>
                <button type="button" className="settings-item col-span-2" onClick={() => openUtility('settings')}>
                  <div className="settings-item-icon bg-purple-500/20 text-purple-400">
                    <Settings size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.settingsCenter}</span>
                    <span className="settings-item-desc">{uiText.settingsDesc}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 奖励活动 */}
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-indicator settings-indicator-orange"></span>
                <span className="settings-section-title">{uiText.rewards}</span>
                <span className="settings-section-subtitle">REWARDS</span>
              </div>
              <div className="settings-grid">
                <button type="button" className="settings-item col-span-2 settings-item-highlight" onClick={handleCheckIn}>
                  <div className="settings-item-icon bg-emerald-500/20 text-emerald-400">
                    <Gift size={20} />
                  </div>
                  <div className="settings-item-content">
                    <div className="flex items-center gap-2">
                      <span className="settings-item-label">{uiText.dailyCheckIn}</span>
                      {!signedToday && <span className="settings-badge-dot"></span>}
                    </div>
                    <span className="settings-item-desc">{uiText.checkInDesc}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 服务支持 */}
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-indicator settings-indicator-cyan"></span>
                <span className="settings-section-title">{uiText.support}</span>
                <span className="settings-section-subtitle">SUPPORT</span>
              </div>
              <div className="settings-grid">
                <button type="button" className="settings-item" onClick={() => openUtility('customer')}>
                  <div className="settings-item-icon bg-cyan-500/20 text-cyan-400">
                    <Headphones size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.customer}</span>
                    <span className="settings-item-desc">{isEnglish ? 'Contact online support' : '联系在线客服'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => openUtility('messages')}>
                  <div className="settings-item-icon bg-yellow-500/20 text-yellow-400">
                    <Bell size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.messages}</span>
                    <span className="settings-item-desc">{isEnglish ? 'View account notices' : '查看账户通知'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => openUtility('complaint')}>
                  <div className="settings-item-icon bg-red-500/20 text-red-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.complaint}</span>
                    <span className="settings-item-desc">{isEnglish ? 'Submit service complaints' : '反馈投诉问题'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => openUtility('feedback')}>
                  <div className="settings-item-icon bg-amber-500/20 text-amber-400">
                    <MessageSquare size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.feedback}</span>
                    <span className="settings-item-desc">{isEnglish ? 'Submit bugs and ideas' : '提交BUG与建议'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 平台工具 */}
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-indicator settings-indicator-green"></span>
                <span className="settings-section-title">{uiText.platform}</span>
                <span className="settings-section-subtitle">PLATFORM</span>
              </div>
              <div className="settings-grid">
                <button type="button" className="settings-item" onClick={() => openUtility('pricing')}>
                  <div className="settings-item-icon bg-emerald-500/20 text-emerald-400">
                    <DollarSign size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.pricing}</span>
                    <span className="settings-item-desc">{isEnglish ? 'View model billing' : '查看模型计费'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => openUtility('api')}>
                  <div className="settings-item-icon bg-blue-500/20 text-blue-400">
                    <Code2 size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.apiDocs}</span>
                    <span className="settings-item-desc">{isEnglish ? 'Endpoints and examples' : '接口与文档'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => openUtility('assets')}>
                  <div className="settings-item-icon bg-sky-500/20 text-sky-400">
                    <Image size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.assets}</span>
                    <span className="settings-item-desc">{isEnglish ? 'Manage reusable assets' : '管理与复用创作资产'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item" onClick={() => openUtility('agency')}>
                  <div className="settings-item-icon bg-emerald-500/20 text-emerald-400">
                    <Building2 size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.agency}</span>
                    <span className="settings-item-desc">{isEnglish ? 'Partner entrance' : '代理商入口'}</span>
                  </div>
                </button>
                <button type="button" className="settings-item col-span-2" onClick={() => openUtility('announcement')}>
                  <div className="settings-item-icon bg-orange-500/20 text-orange-400">
                    <Megaphone size={20} />
                  </div>
                  <div className="settings-item-content">
                    <span className="settings-item-label">{uiText.announcement}</span>
                    <span className="settings-item-desc">{isEnglish ? 'System updates' : '系统更新通知'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeUtility && utilityContent[activeUtility] && (
        <div className="utility-modal-backdrop" onClick={() => setActiveUtility(null)}>
          <section className="utility-modal glass" onClick={(event) => event.stopPropagation()}>
            <header className="utility-modal-header">
              <div>
                <p>{isEnglish ? '2PIX utility' : '2PIX 平台工具'}</p>
                <h2>{utilityContent[activeUtility].title}</h2>
                <span>{utilityContent[activeUtility].desc}</span>
              </div>
              <button type="button" onClick={() => setActiveUtility(null)} aria-label={isEnglish ? 'Close' : '关闭'}>
                <X size={18} />
              </button>
            </header>
            <div className="utility-modal-body">{utilityContent[activeUtility].body}</div>
            <footer className="utility-modal-footer">
              <button type="button" onClick={() => setActiveUtility(null)}>
                {isEnglish ? 'Close' : '关闭'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
