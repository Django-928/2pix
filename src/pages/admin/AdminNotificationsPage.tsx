import { useEffect, useMemo, useState } from 'react';
import { Bell, Megaphone, RefreshCw, Search, Send, Users } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface NotificationItem {
  id: number;
  userId: number;
  username: string | null;
  email: string | null;
  type: string;
  title: string;
  content: string;
  readAt: string | null;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
}

interface NotificationData {
  list: NotificationItem[];
  stats: {
    total: number;
    unread: number;
    announcements: number;
    today: number;
  };
}

interface SearchUser {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  status: string;
}

export default function AdminNotificationsPage() {
  const toast = useToast();
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<'all' | 'users'>('all');
  const [type, setType] = useState('system');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [syncAnnouncement, setSyncAnnouncement] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);

  const selectedIds = useMemo(() => selectedUsers.map((item) => item.id), [selectedUsers]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.get<NotificationData>('/admin/notifications?pageSize=40');
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const searchUsers = async () => {
    if (!keyword.trim()) return;
    const result = await api.get<SearchUser[]>(`/admin/notifications/users/search?keyword=${encodeURIComponent(keyword.trim())}`);
    setSearchResults(result);
  };

  const addUser = (user: SearchUser) => {
    setSelectedUsers((prev) => prev.some((item) => item.id === user.id) ? prev : [...prev, user]);
  };

  const removeUser = (id: number) => {
    setSelectedUsers((prev) => prev.filter((item) => item.id !== id));
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSyncAnnouncement(false);
    setSelectedUsers([]);
    setSearchResults([]);
    setKeyword('');
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      toast.warning('标题和内容不能为空');
      return;
    }
    if (mode === 'users' && selectedIds.length === 0) {
      toast.warning('请选择至少一个接收用户');
      return;
    }

    const confirmMessage = mode === 'all'
      ? `确认向全部活跃用户发送「${title}」？`
      : `确认向 ${selectedIds.length} 个指定用户发送「${title}」？`;
    if (!window.confirm(confirmMessage)) return;

    setSending(true);
    try {
      const result = await api.post<{ recipients: number; batchId: string; syncAnnouncement: boolean }>('/admin/notifications/send', {
        mode,
        userIds: selectedIds,
        type,
        title,
        content,
        syncAnnouncement,
      });
      toast.success(`发送成功，共 ${result.recipients} 位用户收到通知`);
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">通知与公告</h1>
          <p className="text-dark-400 mt-1">发送站内信、发布系统公告，并查看最近通知投递记录。</p>
        </div>
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { label: '累计通知', value: data?.stats.total || 0, icon: Bell, tone: 'bg-purple-500/20 text-purple-400' },
          { label: '未读通知', value: data?.stats.unread || 0, icon: Bell, tone: 'bg-red-500/20 text-red-400' },
          { label: '公告通知', value: data?.stats.announcements || 0, icon: Megaphone, tone: 'bg-amber-500/20 text-amber-400' },
          { label: '今日发送', value: data?.stats.today || 0, icon: Send, tone: 'bg-cyan-500/20 text-cyan-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${item.tone} flex items-center justify-center`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-sm text-dark-500">{item.label}</p>
                  <p className="text-2xl font-bold text-dark-100">{Number(item.value).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-6">
        <section className="glass rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">发送通知</h2>
            <p className="text-sm text-dark-500 mt-1">支持全体用户广播或指定用户定向发送。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-sm text-dark-400">接收范围</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'users')} className="input-field">
                <option value="all">全部活跃用户</option>
                <option value="users">指定用户</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-dark-400">通知类型</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
                <option value="system">系统通知</option>
                <option value="announcement">系统公告</option>
                <option value="activity">活动通知</option>
                <option value="security">安全提醒</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-dark-400">同步公告栏</span>
              <button
                type="button"
                onClick={() => setSyncAnnouncement((prev) => !prev)}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-left ${
                  syncAnnouncement
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-dark-900/50 text-dark-400 border-purple-500/10'
                }`}
              >
                {syncAnnouncement ? '同步为全局公告' : '仅发送站内信'}
              </button>
            </label>
          </div>

          {mode === 'users' && (
            <div className="rounded-2xl border border-purple-500/10 bg-dark-900/30 p-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') searchUsers().catch(() => undefined); }}
                    placeholder="搜索用户名、邮箱或昵称"
                    className="input-field pl-10"
                  />
                </div>
                <button onClick={searchUsers} className="btn-secondary">搜索</button>
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => removeUser(user.id)}
                      className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-200 border border-purple-500/20 text-xs"
                    >
                      {user.username} ×
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => addUser(user)}
                      className="text-left rounded-xl bg-dark-900/60 hover:bg-purple-500/10 border border-purple-500/10 px-3 py-2"
                    >
                      <p className="text-sm text-dark-100">{user.nickname || user.username}</p>
                      <p className="text-xs text-dark-500">{user.username} · {user.email} · {user.status}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="space-y-2 block">
            <span className="text-sm text-dark-400">标题</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="input-field" placeholder="例如：系统维护通知" />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm text-dark-400">内容</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={7}
              className="input-field resize-none"
              placeholder="输入要发送给用户的通知内容。"
            />
            <span className="text-xs text-dark-500">{content.length}/2000</span>
          </label>

          <button
            onClick={handleSend}
            disabled={sending}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            {sending ? '发送中...' : '发送通知'}
          </button>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">最近通知</h2>
              <p className="text-sm text-dark-500 mt-1">展示最近投递的站内信记录。</p>
            </div>
            <Users size={20} className="text-dark-500" />
          </div>
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {loading && <div className="text-sm text-dark-500 py-8 text-center">加载中...</div>}
            {!loading && data?.list.length === 0 && <div className="text-sm text-dark-500 py-8 text-center">暂无通知</div>}
            {data?.list.map((item) => (
              <div key={item.id} className="rounded-2xl border border-purple-500/10 bg-dark-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-dark-100">{item.title}</p>
                    <p className="text-xs text-dark-500 mt-1">
                      {item.username || `用户 ${item.userId}`} · {item.type} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!item.readAt && <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-300 text-[11px]">未读</span>}
                </div>
                <p className="text-sm text-dark-400 mt-3 line-clamp-3">{item.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
