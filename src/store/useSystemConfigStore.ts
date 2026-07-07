import { create } from 'zustand';
import api from '@/utils/api';

export interface PublicSystemConfig {
  platformName: string;
  logoUrl: string;
  maintenanceMode: boolean;
  announcement: string;
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

interface SystemConfigState {
  config: PublicSystemConfig | null;
  loading: boolean;
  loadConfig: () => Promise<void>;
}

const fallbackConfig: PublicSystemConfig = {
  platformName: '2PIX',
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

export const useSystemConfigStore = create<SystemConfigState>((set) => ({
  config: null,
  loading: false,
  loadConfig: async () => {
    set({ loading: true });
    try {
      const config = await api.get<PublicSystemConfig>('/system/public');
      set({ config: { ...fallbackConfig, ...config } });
    } catch {
      set({ config: fallbackConfig });
    } finally {
      set({ loading: false });
    }
  },
}));

export default useSystemConfigStore;
