import { create } from 'zustand';
import api from '@/utils/api';

export interface AccountTransaction {
  id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  related_id?: string | null;
  created_at: string;
}

export interface AccountOrder {
  id?: number;
  order_no: string;
  amount: number;
  tokens: number;
  status: string;
  payment_method: string;
  payment?: PaymentSession;
  payment_time?: string | null;
  expires_at?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSession {
  order_no: string;
  status: string;
  mode: 'mock' | 'production';
  payment_method: string;
  payment_url?: string;
  qr_code?: string;
  message: string;
}

interface AccountState {
  balance: number;
  transactions: AccountTransaction[];
  orders: AccountOrder[];
  loading: boolean;
  refreshBalance: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadOrders: () => Promise<void>;
  createRechargeOrder: (payload: { amount: number; tokens: number; payment_method: string }) => Promise<AccountOrder>;
  getPaymentStatus: (orderNo: string) => Promise<AccountOrder>;
  payRechargeOrder: (orderNo: string) => Promise<{ order_no: string; status: string; tokens: number; balance_after: number; already_paid?: boolean }>;
  mockPayOrder: (orderNo: string) => Promise<{ order_no: string; status: string; tokens: number; balance_after: number }>;
}

export const useAccountStore = create<AccountState>((set) => ({
  balance: 0,
  transactions: [],
  orders: [],
  loading: false,
  refreshBalance: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ balance: number }>('/account/balance');
      set({ balance: data.balance });
    } finally {
      set({ loading: false });
    }
  },
  loadTransactions: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ list: AccountTransaction[] }>('/account/transactions?pageSize=20');
      set({ transactions: data.list });
    } finally {
      set({ loading: false });
    }
  },
  loadOrders: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{ list: AccountOrder[] }>('/account/orders?pageSize=20');
      set({ orders: data.list });
    } finally {
      set({ loading: false });
    }
  },
  createRechargeOrder: async (payload) => {
    return api.post<AccountOrder>('/account/orders', payload);
  },
  getPaymentStatus: async (orderNo) => {
    return api.get<AccountOrder>(`/payment/orders/${orderNo}/status`);
  },
  payRechargeOrder: async (orderNo) => {
    const data = await api.post<{ order_no: string; status: string; tokens: number; balance_after: number; already_paid?: boolean }>(`/payment/orders/${orderNo}/pay`);
    set({ balance: data.balance_after });
    return data;
  },
  mockPayOrder: async (orderNo) => {
    const data = await api.post<{ order_no: string; status: string; tokens: number; balance_after: number }>(`/payment/orders/${orderNo}/pay`);
    set({ balance: data.balance_after });
    return data;
  },
}));

export default useAccountStore;
