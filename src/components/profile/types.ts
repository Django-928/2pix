import {
  User,
  CreditCard,
  Receipt,
  Gift,
  Key,
  Settings,
  Sparkles,
  Image,
  Video,
  Music,
} from 'lucide-react';

export type ProfileTab = 'overview' | 'recharge' | 'records' | 'invite' | 'api' | 'settings';
export type WorkFilter = 'all' | 'image' | 'video' | 'audio';

export interface SecurityHistory {
  logs: Array<{
    id: number;
    action: string;
    ip_address: string;
    user_agent: string;
    details: string | null;
    created_at: string;
  }>;
  sessions: Array<{
    id: number;
    ip_address: string;
    user_agent: string;
    expires_at: string;
    created_at: string;
  }>;
}

export interface MembershipPlan {
  id: number;
  name: string;
  amount: number;
  tokens: number;
  badge: string | null;
  tone: string | null;
  description: string | null;
  sort_order: number;
  status: string;
}

export interface ApiKeyItem {
  id: number;
  name: string;
  key_prefix: string;
  scope: string;
  enabled: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface CheckInStatus {
  today: string;
  checkedIn: boolean;
  reward: number;
  todayReward: number;
  streakDays: number;
  lastCheckInDate: string | null;
}

export interface InviteData {
  inviteCode: string;
  inviteCount: number;
  totalReward: number;
  list: Array<{
    id: number;
    inviteeId: number;
    inviteeName: string;
    rewardAmount: number;
    createdAt: string;
  }>;
}

export interface NotificationData {
  unread: number;
  list: Array<{
    id: number;
    type: string;
    title: string;
    content: string;
    readAt: string | null;
    relatedType: string | null;
    relatedId: string | null;
    createdAt: string;
  }>;
}

export interface AccountStats {
  balance: number;
  monthlyConsumption: number;
  monthlyRechargeAmount: number;
  monthlyRechargeTokens: number;
  totalWorks: number;
  worksByType: {
    image: number;
    video: number;
    audio: number;
  };
  totalCalls: number;
  totalUsageCost: number;
  apiKeys: {
    total: number;
    enabled: number;
  };
  invites: {
    count: number;
    reward: number;
  };
  checkins: {
    maxStreak: number;
    totalReward: number;
  };
  trend: Array<{
    date: string;
    consumption: number;
    recharge: number;
    works: number;
    calls: number;
  }>;
}

export interface ProfileForm {
  nickname: string;
  phone: string;
  avatar: string;
}

export interface CreatedApiKey {
  id: number;
  name: string;
  key: string;
}

export const profileTabs: Array<{ id: ProfileTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: '个人概览', icon: User },
  { id: 'recharge', label: '在线充值', icon: CreditCard },
  { id: 'records', label: '消费记录', icon: Receipt },
  { id: 'invite', label: '邀请奖励', icon: Gift },
  { id: 'api', label: 'API 密钥', icon: Key },
  { id: 'settings', label: '账号设置', icon: Settings },
];

export const workFilters: Array<{ id: WorkFilter; label: string; icon: React.ElementType }> = [
  { id: 'all', label: '全部', icon: Sparkles },
  { id: 'image', label: '图片', icon: Image },
  { id: 'video', label: '视频', icon: Video },
  { id: 'audio', label: '音频', icon: Music },
];
