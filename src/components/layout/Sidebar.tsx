import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  User,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Search,
  Pin,
  Wallet,
} from 'lucide-react';
import { primaryCategories, secondaryCategories, getFilteredModels, type AIModel } from '@/data/models';

const iconMap: Record<string, React.ReactNode> = {
  sparkles: <Sparkles size={18} />,
  user: <User size={18} />,
  lightbulb: <Lightbulb size={18} />,
};

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [primaryActive, setPrimaryActive] = useState('damoxing');
  const [secondaryActive, setSecondaryActive] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModel, setActiveModel] = useState('gpt-image-2');

  const filteredModels = useMemo(() => {
    return getFilteredModels(primaryActive, secondaryActive, searchQuery);
  }, [primaryActive, secondaryActive, searchQuery]);

  const handleModelClick = (model: AIModel) => {
    setActiveModel(model.id);
    if (model.category === 'chat') {
      navigate('/chat');
    } else if (model.category === 'image') {
      navigate('/image');
    } else if (model.category === 'video') {
      navigate('/video');
    } else if (model.category === 'audio') {
      navigate('/audio');
    }
  };

  const getTagClass = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('新') || lower.includes('new')) return 'model-tag-new';
    if (lower.includes('热') || lower.includes('热门')) return 'model-tag-hot';
    if (lower.includes('免费')) return 'model-tag-free';
    if (lower.includes('多模态') || lower.includes('工具')) return 'model-tag-multimodal';
    return '';
  };

  const sliderIndex = secondaryCategories.findIndex((c) => c.id === secondaryActive);
  const sliderWidth = `calc(${100 / secondaryCategories.length}% - 0.125rem)`;
  const sliderTransform = `translateX(${sliderIndex * 100}%)`;

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-shine"></div>
        <button
          type="button"
          className="logo-collapse-btn"
          aria-label="切换侧边栏"
          title="切换侧边栏"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="logo-collapse-btn-glow"></span>
          {collapsed ? (
            <ChevronRight size={14} className="logo-collapse-icon" />
          ) : (
            <ChevronLeft size={14} className="logo-collapse-icon" />
          )}
        </button>

        {!collapsed && (
          <div className="logo-container">
            <div className="logo-glow"></div>
            <div className="logo-content">
              <div className="logo-img-wrapper">
                <img
                  src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=AI%20platform%20logo%20wukong%20monkey%20king%20purple%20cyberpunk%20minimalist&image_size=square"
                  alt="2PIX AI"
                  className="logo-img"
                />
              </div>
              <div className="logo-text-wrapper">
                <span className="logo-text">2PIX AI</span>
                <span className="logo-subtitle">AI 大模型聚合平台</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="selector-container">
            <div className="primary-selector">
              {primaryCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`primary-item ${
                    primaryActive === cat.id ? 'primary-item-active' : ''
                  } ${cat.hasSub ? 'primary-item-has-sub' : ''}`}
                  onClick={() => setPrimaryActive(cat.id)}
                >
                  <div className="primary-icon">{iconMap[cat.icon]}</div>
                  <span className="primary-label">{cat.label}</span>
                  <div className="primary-indicator"></div>
                </button>
              ))}
            </div>

            {primaryActive === 'damoxing' && (
              <div className="secondary-selector">
                <div className="secondary-track">
                  <div
                    className="secondary-slider"
                    style={{
                      width: sliderWidth,
                      transform: sliderTransform,
                    }}
                  ></div>
                  {secondaryCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`secondary-item ${
                        secondaryActive === cat.id ? 'secondary-item-active' : ''
                      }`}
                      onClick={() => setSecondaryActive(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="model-list">
            {primaryActive === 'damoxing' && (
              <div className="model-search-sticky">
                <div className="model-search">
                  <Search size={16} className="model-search-icon" />
                  <input
                    type="text"
                    placeholder="搜索模型或功能..."
                    className="model-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            {filteredModels.length > 0 ? (
              filteredModels.map((model) => (
                <div
                  key={model.id}
                  className={`model-item ${
                    activeModel === model.id ? 'model-item-active' : ''
                  }`}
                  onClick={() => handleModelClick(model)}
                >
                  {model.isPinned && (
                    <button
                      type="button"
                      className="zhiding-btn"
                      title="置顶此模型"
                      aria-label="置顶此模型"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pin size={12} />
                    </button>
                  )}
                  <div className="model-icon-wrapper">
                    <div
                      className="model-icon-svg"
                      style={{ fontSize: '18px' }}
                    >
                      {model.icon}
                    </div>
                  </div>
                  <div className="model-info">
                    <div className="model-name-row">
                      <span className="model-name">{model.name}</span>
                      <div className="model-tags">
                        {model.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className={`model-tag ${getTagClass(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="model-description">{model.description}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="task-state-card">
                <Search size={24} />
                <span>未找到相关模型</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="sidebar-user-footer">
        <div
          className="sidebar-user-info"
          onClick={() => navigate('/profile')}
        >
          <div className="sidebar-user-avatar-wrap">
            <img
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=handsome%20young%20asian%20man%20portrait%20avatar%20anime%20style%20dark%20hair&image_size=square"
              alt="用户头像"
              className="sidebar-user-avatar"
            />
            <span className="sidebar-user-status-dot"></span>
          </div>
          {!collapsed && (
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">Django</div>
              <div className="sidebar-user-status-text">在线</div>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              className="sidebar-recharge-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/profile');
              }}
            >
              <Wallet size={16} />
              <span>充值</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
