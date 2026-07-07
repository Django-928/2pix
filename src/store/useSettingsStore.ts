import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type LanguageMode = 'zh' | 'en';

export interface ModelApiConfig {
  id: string;
  name: string;
  category: 'chat' | 'image' | 'video' | 'audio';
  provider: string;
  officialModel: string;
  endpoint: string;
  method: 'POST' | 'GET';
  apiKey: string;
  headers: string;
  bodyTemplate: string;
  price: string;
  successRate: number;
  enabled: boolean;
  mockMode: boolean;
  params: string;
}

interface SettingsState {
  theme: ThemeMode;
  language: LanguageMode;
  checkedInDate: string | null;
  demoCredits: number;
  modelApiConfigs: ModelApiConfig[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (language: LanguageMode) => void;
  toggleLanguage: () => void;
  checkIn: () => boolean;
  upsertModelApiConfig: (config: ModelApiConfig) => void;
  deleteModelApiConfig: (id: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const defaultModelConfigs: ModelApiConfig[] = [
  {
    id: 'sora-2-official',
    name: 'Sora-2 官转版',
    category: 'video',
    provider: 'OpenAI',
    officialModel: 'sora-2',
    endpoint: '',
    method: 'POST',
    apiKey: '',
    headers: '{\n  "Content-Type": "application/json"\n}',
    bodyTemplate: '{\n  "model": "sora-2",\n  "prompt": "{{prompt}}",\n  "duration": "{{duration}}",\n  "resolution": "{{resolution}}"\n}',
    price: '演示预计 12-36 积分',
    successRate: 79,
    enabled: true,
    mockMode: true,
    params: 'ratio,resolution,duration,count',
  },
  {
    id: 'seedance-2-omni',
    name: 'SD 2.0 全能参考',
    category: 'video',
    provider: '字节跳动即梦',
    officialModel: 'seedance-2.0-omni',
    endpoint: '',
    method: 'POST',
    apiKey: '',
    headers: '{\n  "Content-Type": "application/json"\n}',
    bodyTemplate: '{\n  "prompt": "{{prompt}}",\n  "assets": "{{assets}}",\n  "mode": "omni"\n}',
    price: '按分辨率与素材类型计费',
    successRate: 100,
    enabled: true,
    mockMode: true,
    params: 'mode,version,ratio,resolution',
  },
  {
    id: 'grok-video-3-5',
    name: 'grok-video-3.5',
    category: 'video',
    provider: 'xAI',
    officialModel: 'grok-video-3.5',
    endpoint: '',
    method: 'POST',
    apiKey: '',
    headers: '{\n  "Content-Type": "application/json"\n}',
    bodyTemplate: '{\n  "prompt": "{{prompt}}",\n  "first_frame": "{{firstFrame}}"\n}',
    price: '演示预计 0.1076/秒',
    successRate: 98,
    enabled: true,
    mockMode: true,
    params: 'ratio,resolution,duration',
  },
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'zh',
      checkedInDate: null,
      demoCredits: 1280,
      modelApiConfigs: defaultModelConfigs,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set((state) => ({ language: state.language === 'zh' ? 'en' : 'zh' })),
      checkIn: () => {
        if (get().checkedInDate === today()) return false;
        set((state) => ({ checkedInDate: today(), demoCredits: state.demoCredits + 80 }));
        return true;
      },
      upsertModelApiConfig: (config) =>
        set((state) => {
          const exists = state.modelApiConfigs.some((item) => item.id === config.id);
          return {
            modelApiConfigs: exists
              ? state.modelApiConfigs.map((item) => (item.id === config.id ? config : item))
              : [config, ...state.modelApiConfigs],
          };
        }),
      deleteModelApiConfig: (id) =>
        set((state) => ({ modelApiConfigs: state.modelApiConfigs.filter((item) => item.id !== id) })),
    }),
    {
      name: '2pix-global-settings',
    },
  ),
);

export default useSettingsStore;
