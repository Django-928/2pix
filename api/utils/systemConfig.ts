import db from '../db/index.js';

export interface SystemConfig {
  platformName: string;
  logoUrl: string;
  welcomeBonus: number;
  dailyCheckInBonus: number;
  orderExpireMinutes: number;
  modelCallTimeoutSeconds: number;
  maintenanceMode: boolean;
  announcement: string;
  dailyCheckinReward: number;
  inviteRewardPercent: number;
  // 首页自定义
  heroTitleZh: string;
  heroTitleEn: string;
  heroEnglishTitleZh: string;
  heroEnglishTitleEn: string;
  heroSubtitleZh: string;
  heroSubtitleEn: string;
  heroCtaZh: string;
  heroCtaEn: string;
  footerCopyrightZh: string;
  footerCopyrightEn: string;
}

export const defaultSystemConfig: SystemConfig = {
  platformName: '2PIX',
  logoUrl: '',
  welcomeBonus: 0,
  dailyCheckInBonus: 80,
  orderExpireMinutes: 30,
  modelCallTimeoutSeconds: 120,
  maintenanceMode: false,
  announcement: '',
  dailyCheckinReward: 80,
  inviteRewardPercent: 10,
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

export function getSystemConfig(): SystemConfig {
  const row = db.prepare('SELECT config_value FROM admin_configs WHERE config_key = ?').get('system') as { config_value: string } | undefined;
  if (!row?.config_value) return defaultSystemConfig;

  try {
    const parsed = JSON.parse(row.config_value);
    return {
      ...defaultSystemConfig,
      ...parsed,
      welcomeBonus: Number(parsed.welcomeBonus ?? defaultSystemConfig.welcomeBonus),
      dailyCheckInBonus: Number(parsed.dailyCheckInBonus ?? defaultSystemConfig.dailyCheckInBonus),
      orderExpireMinutes: Number(parsed.orderExpireMinutes ?? defaultSystemConfig.orderExpireMinutes),
      modelCallTimeoutSeconds: Number(parsed.modelCallTimeoutSeconds ?? defaultSystemConfig.modelCallTimeoutSeconds),
      maintenanceMode: Boolean(parsed.maintenanceMode),
    };
  } catch {
    return defaultSystemConfig;
  }
}

const safeStr = (value: unknown, fallback: string, maxLen: number) =>
  String(value || fallback).slice(0, maxLen);

export function sanitizeSystemConfig(value: Partial<SystemConfig>): SystemConfig {
  return {
    platformName: safeStr(value.platformName, defaultSystemConfig.platformName, 50),
    logoUrl: safeStr(value.logoUrl, defaultSystemConfig.logoUrl, 500),
    welcomeBonus: Math.max(0, Math.floor(Number(value.welcomeBonus ?? defaultSystemConfig.welcomeBonus))),
    dailyCheckInBonus: Math.min(10000, Math.max(0, Math.floor(Number(value.dailyCheckInBonus ?? defaultSystemConfig.dailyCheckInBonus)))),
    orderExpireMinutes: Math.min(1440, Math.max(5, Math.floor(Number(value.orderExpireMinutes ?? defaultSystemConfig.orderExpireMinutes)))),
    modelCallTimeoutSeconds: Math.min(3600, Math.max(10, Math.floor(Number(value.modelCallTimeoutSeconds ?? defaultSystemConfig.modelCallTimeoutSeconds)))),
    maintenanceMode: Boolean(value.maintenanceMode),
    announcement: safeStr(value.announcement, defaultSystemConfig.announcement, 1000),
    dailyCheckinReward: Math.min(1000, Math.max(0, Math.floor(Number(value.dailyCheckinReward ?? defaultSystemConfig.dailyCheckinReward)))),
    inviteRewardPercent: Math.min(100, Math.max(0, Math.floor(Number(value.inviteRewardPercent ?? defaultSystemConfig.inviteRewardPercent)))),
    heroTitleZh: safeStr(value.heroTitleZh, defaultSystemConfig.heroTitleZh, 100),
    heroTitleEn: safeStr(value.heroTitleEn, defaultSystemConfig.heroTitleEn, 100),
    heroEnglishTitleZh: safeStr(value.heroEnglishTitleZh, defaultSystemConfig.heroEnglishTitleZh, 200),
    heroEnglishTitleEn: safeStr(value.heroEnglishTitleEn, defaultSystemConfig.heroEnglishTitleEn, 200),
    heroSubtitleZh: safeStr(value.heroSubtitleZh, defaultSystemConfig.heroSubtitleZh, 300),
    heroSubtitleEn: safeStr(value.heroSubtitleEn, defaultSystemConfig.heroSubtitleEn, 300),
    heroCtaZh: safeStr(value.heroCtaZh, defaultSystemConfig.heroCtaZh, 50),
    heroCtaEn: safeStr(value.heroCtaEn, defaultSystemConfig.heroCtaEn, 50),
    footerCopyrightZh: safeStr(value.footerCopyrightZh, defaultSystemConfig.footerCopyrightZh, 200),
    footerCopyrightEn: safeStr(value.footerCopyrightEn, defaultSystemConfig.footerCopyrightEn, 200),
  };
}
