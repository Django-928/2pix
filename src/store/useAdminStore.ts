import { create } from 'zustand';
import api from '@/utils/api';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  role_name: string;
  status: string;
  balance: number;
  permissions: string[];
}

interface AdminState {
  user: AdminUser | null;
  token: string | null;
  isLogin: boolean;
  initialized: boolean;
  setUser: (user: AdminUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  initFromToken: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export const useAdminStore = create<AdminState>((set, get) => ({
  user: null,
  token: getAdminToken(),
  isLogin: !!getAdminToken(),
  initialized: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
    set({ token, isLogin: !!token });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    set({ user: null, token: null, isLogin: false, initialized: false });
  },
  initFromToken: async () => {
    const { token } = get();
    if (!token) { set({ initialized: true }); return; }
    try {
      const data = await api.get<{ user: AdminUser }>('/auth/me');
      if (data?.user) {
        set({ user: data.user, isLogin: true, initialized: true });
      } else {
        get().logout();
      }
    } catch {
      get().logout();
    }
  },
  hasPermission: (perm: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.role_name === 'admin' || user.role_name === 'django') return true;
    return user.permissions?.includes(perm) ?? false;
  },
}));

export default useAdminStore;
