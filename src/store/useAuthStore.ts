import { create } from 'zustand';
import api from '@/utils/api';

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  role_name?: string | null;
  status: string;
  balance: number;
}

interface AuthState {
  user: CurrentUser | null;
  token: string | null;
  isLogin: boolean;
  loading: boolean;
  setUser: (user: CurrentUser | null) => void;
  setToken: (token: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; email: string; password: string; phone?: string; nickname?: string; inviteCode?: string }) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('user_token'),
  isLogin: !!localStorage.getItem('user_token'),
  loading: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('user_token', token);
    } else {
      localStorage.removeItem('user_token');
    }
    set({ token, isLogin: !!token });
  },
  login: async (username, password) => {
    set({ loading: true });
    try {
      const data = await api.post<{ token: string; user: CurrentUser }>('/auth/login', { username, password });
      localStorage.setItem('user_token', data.token);
      set({ token: data.token, user: data.user, isLogin: true });
    } finally {
      set({ loading: false });
    }
  },
  register: async (payload) => {
    set({ loading: true });
    try {
      const data = await api.post<{ token: string; user: CurrentUser }>('/auth/register', payload);
      localStorage.setItem('user_token', data.token);
      set({ token: data.token, user: data.user, isLogin: true });
    } finally {
      set({ loading: false });
    }
  },
  refreshMe: async () => {
    if (!get().token) return;
    set({ loading: true });
    try {
      const user = await api.get<CurrentUser>('/auth/me');
      set({ user, isLogin: true });
    } catch {
      localStorage.removeItem('user_token');
      set({ user: null, token: null, isLogin: false });
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    try {
      if (get().token) {
        await api.post('/auth/logout');
      }
    } catch {
      // 忽略退出接口失败，前端仍清理本地登录态
    }
    localStorage.removeItem('user_token');
    set({ user: null, token: null, isLogin: false });
  },
}));

export default useAuthStore;
