import { useEffect, createContext, useContext, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Sparkles,
  Layers,
  Zap,
  CreditCard,
  ArrowRight,
  Menu,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import useSystemConfigStore, { type PublicSystemConfig } from '@/store/useSystemConfigStore';

type Lang = 'zh' | 'en';
type Theme = 'dark' | 'light';

interface PageContextType {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  t: (obj: { zh: string; en: string }) => string;
  config: PublicSystemConfig;
}

const PageContext = createContext<PageContextType | null>(null);

function usePage() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error('usePage must be used within PageProvider');
  return ctx;
}

/* ---------- Shared primitives ---------- */

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

function PrimaryButton({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/home')}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--aura-btn-bg)] text-[var(--aura-btn-text)] font-medium text-sm px-5 py-3 transition-all hover:bg-[var(--aura-btn-hover)] active:scale-[0.98]"
    >
      <Sparkles className="w-4 h-4" />
      <span>{label}</span>
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
    </button>
  );
}

function SectionEyebrow({ label, tag }: { label: string; tag?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--aura-text)]" />
      <span className="text-sm font-medium text-[var(--aura-text-80)]">{label}</span>
      {tag && (
        <span className="px-2 py-0.5 rounded-full border border-[var(--aura-border)] text-[var(--aura-text-50)] text-xs">
          {tag}
        </span>
      )}
    </div>
  );
}

const gradientStyle = (theme: Theme): React.CSSProperties => ({
  backgroundImage:
    theme === 'dark'
      ? 'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)'
      : 'linear-gradient(to right, #0B2551 0%, #00d2ff 25%, #A4F4FD 50%, #00d2ff 75%, #0B2551 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter: 'url(#c3-noise)',
});

/* ---------- SEO ---------- */

function useSeo(lang: Lang) {
  useEffect(() => {
    const titles = {
      zh: 'AI聚合平台 | 电商AI出图 · 一键生成 · 按量计费',
      en: 'AI Aggregator | E-commerce AI Images · One-click · Pay-as-you-go',
    };
    const descriptions = {
      zh: '一个账户聚合 GPT、Claude、Midjourney 等 30+ 主流 AI 模型。电商出图、AI 漫剧、PPT 一键生成，按量计费，透明扣费。',
      en: 'One account for GPT, Claude, Midjourney and 30+ AI models. Generate e-commerce images, short dramas, and PPTs with one click.',
    };

    document.title = titles[lang];

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta(
      'description',
      descriptions[lang]
    );
    setMeta(
      'keywords',
      'AI聚合平台，电商AI出图，一键生成主图，按量计费AI, AI aggregator, e-commerce AI image generator, one-click product photos, pay-as-you-go AI'
    );
  }, [lang]);
}

/* ---------- Translations ---------- */

const T = {
  nav: {
    links: {
      zh: ['功能', '定价', '文档', '关于'],
      en: ['Features', 'Pricing', 'Docs', 'About'],
    },
    cta: { zh: '开始创作', en: 'Start Creating' },
  },
  hero: {
    title: { zh: '灵感流动，万物生长', en: '灵感流动，万物生长' },
    englishTitle: { zh: 'Inspiration flows. Everything grows.', en: 'Inspiration flows. Everything grows.' },
    subtitle1: { zh: '一个账户，聚合主流 AI 模型。', en: 'One account, all major AI models.' },
    subtitle2Line1: { zh: '电商出图 · 漫剧 · PPT', en: 'E-commerce images, short dramas, and PPTs' },
    subtitle2Line2: { zh: '一键生成', en: 'with one click' },
    cta: { zh: '开始创作', en: 'Start Creating' },
  },
  coreValues: {
    eyebrow: { zh: '三大核心价值', en: 'Three Core Values' },
    tag: { zh: 'Why 2Pix AI', en: 'Why 2Pix AI' },
    items: [
      {
        title: { zh: '全模型聚合', en: 'All Models in One' },
        desc: {
          zh: 'GPT / Claude / Midjourney … 30+ 模型，一个 Key 全调通。',
          en: 'GPT, Claude, Midjourney … 30+ models, one API key.',
        },
      },
      {
        title: { zh: '一键工作流', en: 'One-Click Workflows' },
        desc: {
          zh: '内置多个智能体，一键调用工作流，高效解决问题。',
          en: 'Built-in agents, one-click workflows, solve problems efficiently.',
        },
      },
      {
        title: { zh: '透明按量计费', en: 'Pay-as-you-go' },
        desc: {
          zh: '每次生成显示扣费明细，用多少花多少，无隐性消费。',
          en: 'Every generation shows its cost. No surprises, no subscriptions.',
        },
      },
    ],
  },
  cta: {
    title: { zh: '灵感流动 | 万物生长', en: 'Inspiration flows. Everything grows.' },
    subtitle: {
      zh: '一个账户，聚合所有主流 AI 模型。电商出图、漫剧、PPT，一键生成。',
      en: 'One account, all major AI models. E-commerce images, short dramas, and PPTs with one click.',
    },
    primary: { zh: '开始创作', en: 'Start Creating' },
    secondary: { zh: '查看文档', en: 'View Docs' },
  },
  footer: {
    brand: { zh: 'AI聚合平台', en: 'AI Aggregator' },
    status: { zh: '系统运行正常', en: 'All systems operational' },
    copyright: { zh: '© 2026 AI聚合平台. All rights reserved.', en: '© 2026 AI Aggregator. All rights reserved.' },
    groups: [
      {
        title: { zh: '产品', en: 'Product' },
        links: {
          zh: ['电商出图', 'AI漫剧', 'PPT生成', '模型列表'],
          en: ['E-commerce Images', 'AI Drama', 'PPT Generator', 'Model List'],
        },
      },
      {
        title: { zh: '支持', en: 'Support' },
        links: {
          zh: ['教程', 'API文档', 'FAQ', '状态页'],
          en: ['Tutorials', 'API Docs', 'FAQ', 'Status'],
        },
      },
      {
        title: { zh: '公司', en: 'Company' },
        links: {
          zh: ['关于', '联系', '协议', '隐私'],
          en: ['About', 'Contact', 'Terms', 'Privacy'],
        },
      },
    ],
  },
};

/* ---------- Section 1 — Navbar ---------- */

function Navbar() {
  const { lang, theme, setLang, setTheme, t, config } = usePage();
  const links = T.nav.links[lang];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-[min(90vw,1440px)] mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" aria-label={`${config.platformName} home`} className="flex items-center gap-2.5 text-[var(--aura-text)]">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="logo" className="h-8 w-8 object-contain" />
          ) : (
            <LogoMark />
          )}
          <span className="text-lg font-semibold tracking-tight">{config.platformName}</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link, i) => (
            <motion.a
              key={link}
              href="#"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
              className="text-[var(--aura-text-70)] text-sm font-medium hover:text-[var(--aura-text)] transition-colors"
            >
              {link}
            </motion.a>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-medium text-[var(--aura-text-80)] hover:bg-[var(--aura-surface-hover)] transition-colors"
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'zh' ? '中 / En' : 'En / 中'}</span>
            <span className="sm:hidden">{lang === 'zh' ? '中' : 'En'}</span>
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] text-[var(--aura-text-80)] hover:bg-[var(--aura-surface-hover)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <div className="hidden sm:block">
            <PrimaryButton label={t(T.nav.cta)} />
          </div>
        </div>

        <button
          className="md:hidden w-10 h-10 rounded-full border border-[var(--aura-border)] bg-[var(--aura-surface)] flex items-center justify-center text-[var(--aura-text)]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </motion.nav>
  );
}

/* ---------- Section 2 — Hero ---------- */

function Hero() {
  const { t, theme, config, lang } = usePage();
  const isZh = lang === 'zh';

  return (
    <section className="relative z-10 min-h-[calc(100svh-4rem)] flex flex-col items-center justify-center px-6 py-20 md:py-28">
      <div className="flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.95]"
        >
          <span className="block animate-shiny" style={gradientStyle(theme)}>
            {isZh ? config.heroTitleZh : config.heroTitleEn}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 md:mt-10 text-base md:text-xl font-light text-[var(--aura-text-60)] tracking-wider"
        >
          {isZh ? config.heroEnglishTitleZh : config.heroEnglishTitleEn}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 md:mt-16 max-w-xl space-y-6"
        >
          <p className="text-[var(--aura-text-80)] text-lg md:text-xl leading-[1.6]">
            {isZh ? config.heroSubtitleZh : config.heroSubtitleEn}
          </p>
          <div className="text-[var(--aura-text-60)] text-base md:text-lg leading-[1.7] space-y-1">
            <p>{t(T.hero.subtitle2Line1)}</p>
            <p>{t(T.hero.subtitle2Line2)}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 md:mt-20"
        >
          <PrimaryButton label={isZh ? config.heroCtaZh : config.heroCtaEn} />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Section 3 — Core Values ---------- */

const coreValueIcons = [Layers, Zap, CreditCard];

function CoreValues() {
  const { lang, t } = usePage();

  return (
    <section className="relative z-10 max-w-[min(90vw,1440px)] mx-auto px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-12"
      >
        <SectionEyebrow label={t(T.coreValues.eyebrow)} tag={t(T.coreValues.tag)} />
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {T.coreValues.items.map((item, i) => {
          const Icon = coreValueIcons[i];
          return (
            <motion.div
              key={item.title.zh}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="liquid-glass rounded-2xl p-6 flex flex-col"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--aura-text)]">{t(item.title)}</h3>
              <p className="mt-4 text-sm text-[var(--aura-text-70)] leading-relaxed">{t(item.desc)}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Section 4 — FinalCTA ---------- */

function FinalCTA() {
  const { t } = usePage();

  return (
    <section className="relative z-10 max-w-[min(90vw,1440px)] mx-auto px-6 py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
            opacity: 0.3,
          }}
        />
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] text-[var(--aura-text)]">
            {t(T.cta.title)}
          </h2>
          <p className="mt-6 text-[var(--aura-text-60)] max-w-md mx-auto text-sm leading-[1.6]">
            {t(T.cta.subtitle)}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <PrimaryButton label={t(T.cta.primary)} />
            <button className="group inline-flex items-center gap-1 rounded-full border border-[var(--aura-border)] text-[var(--aura-text)] text-sm font-medium px-5 py-3 hover:bg-[var(--aura-surface)] transition-colors">
              {t(T.cta.secondary)}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------- Section 8 — Footer ---------- */

function Footer() {
  const { lang, t, config } = usePage();

  return (
    <footer className="relative z-10 border-t border-[var(--aura-border)] bg-[var(--aura-surface)]/30 backdrop-blur-xl">
      <div className="max-w-[min(90vw,1440px)] mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <a href="#" className="flex items-center gap-2.5 text-[var(--aura-text)]">
              <LogoMark className="w-7 h-7" />
              <span className="text-lg font-semibold">2Pix AI</span>
            </a>
            <p className="mt-4 text-xs text-[var(--aura-text-50)] leading-relaxed">
              {t(T.footer.brand)}
            </p>
          </div>
          {T.footer.groups.map((group) => (
            <div key={group.title.zh}>
              <h4 className="text-sm font-semibold text-[var(--aura-text)]">
                {t(group.title)}
              </h4>
              <ul className="mt-4 space-y-2">
                {group.links[lang].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-[var(--aura-text-50)] hover:text-[var(--aura-text)] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-[var(--aura-border)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--aura-text-50)]">
            {lang === 'zh' ? config.footerCopyrightZh : config.footerCopyrightEn}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--aura-text-50)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t(T.footer.status)}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Page ---------- */

function Background() {
  const { theme } = usePage();
  const [videoError, setVideoError] = useState(false);

  const isLight = theme === 'light';
  const overlay = isLight
    ? 'linear-gradient(180deg, rgba(248,249,250,0.82) 0%, rgba(248,249,250,0.70) 50%, rgba(232,236,239,0.88) 100%)'
    : 'rgba(12,12,12,0.35)';

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Fallback gradient shown while video loads or on error */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: isLight
            ? 'radial-gradient(circle at 50% 0%, #eef7ff 0%, #f8f9fa 60%, #e8eaed 100%)'
            : 'radial-gradient(circle at 50% 0%, #0b1d3a 0%, #05080f 60%, #000000 100%)',
          opacity: videoError ? 1 : 0.6,
        }}
      />

      {!videoError && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/videos/bg.mp4"
        />
      )}

      <div
        className="absolute inset-0 transition-all duration-500"
        style={{ background: overlay }}
      />
    </div>
  );
}

export default function AuraPage() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'zh';
    return (localStorage.getItem('aura-lang') as Lang) || 'zh';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('aura-theme') as Theme) || 'dark';
  });
  const { config: remoteConfig, loadConfig } = useSystemConfigStore();

  useEffect(() => {
    localStorage.setItem('aura-lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('aura-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useSeo(lang);

  const t = (obj: { zh: string; en: string }) => obj[lang];
  const config = remoteConfig ?? {
    platformName: '2Pix AI',
    logoUrl: '',
    maintenanceMode: false,
    announcement: '',
    heroTitleZh: '灵感流动，万物生长',
    heroTitleEn: '灵感流动，万物生长',
    heroEnglishTitleZh: 'Inspiration flows. Everything grows.',
    heroEnglishTitleEn: 'Inspiration flows. Everything grows.',
    heroSubtitleZh: '一个账户，聚合主流 AI 模型。',
    heroSubtitleEn: 'One account, all major AI models.',
    heroCtaZh: '开始创作',
    heroCtaEn: 'Start Creating',
    footerCopyrightZh: '© 2026 AI聚合平台. All rights reserved.',
    footerCopyrightEn: '© 2026 AI Aggregator. All rights reserved.',
  };

  return (
    <PageContext.Provider value={{ lang, theme, setLang, setTheme, t, config }}>
      <div
        data-aura-theme={theme}
        className="relative min-h-screen overflow-x-hidden bg-[var(--aura-bg)] text-[var(--aura-text)] selection:bg-brand/30"
      >
        {/* Root SVG noise filter */}
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <filter id="c3-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </svg>

        <Background />

        {/* Content */}
        <div className="relative z-10">
          <Navbar />
          <Hero />
          <CoreValues />
          <FinalCTA />
          <Footer />
        </div>
      </div>
    </PageContext.Provider>
  );
}
