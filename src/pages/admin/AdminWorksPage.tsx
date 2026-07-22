import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle, Eye, FileText, Image, Music, RefreshCw, Search, Trash2, Video, XCircle, XOctagon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import api from '@/utils/api';

interface AdminWork {
  id: string;
  userId: number;
  username: string | null;
  email: string | null;
  name: string;
  type: 'image' | 'video' | 'audio';
  status: 'pending' | 'complete' | 'failed';
  inputParams: Record<string, unknown>;
  outputUrl: string | null;
  provider: string | null;
  model: string | null;
  reviewStatus: 'pending' | 'approved' | 'violated' | 'taken_down';
  reviewReason: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewedByUsername?: string | null;
  createdAt: string;
  updatedAt: string;
  userStats?: {
    totalWorks: number;
    totalSpent: number;
    totalCalls: number;
  };
}

interface WorkListData {
  list: AdminWork[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    total: number;
    image: number;
    video: number;
    audio: number;
    failed: number;
    today: number;
    pendingReview: number;
    violated: number;
    takenDown: number;
  };
}

const typeLabels: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
};

const statusLabels: Record<string, string> = {
  pending: '处理中',
  complete: '完成',
  failed: '失败',
};

const reviewStatusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  violated: '违规',
  taken_down: '已下架',
};

const reviewStatusTones: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  violated: 'bg-red-500/10 text-red-300 border-red-500/20',
  taken_down: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
};

const REVIEW_ACTIONS: Array<{ value: 'approved' | 'violated' | 'taken_down'; label: string; icon: typeof CheckCircle; color: string }> = [
  { value: 'approved', label: '通过', icon: CheckCircle, color: 'text-emerald-400 hover:bg-emerald-500/10' },
  { value: 'violated', label: '违规', icon: XCircle, color: 'text-red-400 hover:bg-red-500/10' },
  { value: 'taken_down', label: '下架', icon: XOctagon, color: 'text-orange-400 hover:bg-orange-500/10' },
];

export default function AdminWorksPage() {
  const toast = useToast();
  const [data, setData] = useState<WorkListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [detail, setDetail] = useState<AdminWork | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewModal, setReviewModal] = useState<{ work: AdminWork } | null>(null);
  const [batchReviewModal, setBatchReviewModal] = useState<{ action: 'approved' | 'violated' | 'taken_down' } | null>(null);
  const pageSize = 20;

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (reviewStatus) params.set('reviewStatus', reviewStatus);
      const result = await api.get<WorkListData>(`/admin/works?${params.toString()}`);
      setData(result);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [keyword, page, status, type, reviewStatus]);

  useEffect(() => {
    loadWorks().catch(() => undefined);
  }, [loadWorks]);

  const applySearch = () => {
    setPage(1);
    loadWorks().catch(() => undefined);
  };

  const viewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await api.get<AdminWork>(`/admin/works/${id}`);
      setDetail(result);
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteWork = async (work: AdminWork) => {
    const reason = window.prompt(`确认删除作品「${work.name}」？请输入删除原因：`);
    if (!reason?.trim()) return;
    try {
      await api.delete(`/admin/works/${work.id}`);
      toast.success('作品已删除');
      setDetail(null);
      await loadWorks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const reviewWork = async (workId: string, newStatus: 'approved' | 'violated' | 'taken_down', reason: string) => {
    try {
      await api.put(`/admin/works/${workId}/review`, { reviewStatus: newStatus, reviewReason: reason });
      toast.success(`作品已标记为「${reviewStatusLabels[newStatus]}」`);
      setReviewModal(null);
      setDetail(null);
      await loadWorks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '审核失败');
    }
  };

  const batchReview = async (action: 'approved' | 'violated' | 'taken_down', reason: string) => {
    try {
      await api.post('/admin/works/batch-review', {
        ids: Array.from(selected),
        reviewStatus: action,
        reviewReason: reason,
      });
      toast.success(`批量审核完成，已标记为「${reviewStatusLabels[action]}」`);
      setBatchReviewModal(null);
      setSelected(new Set());
      await loadWorks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量审核失败');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selected.size === data.list.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.list.map((w) => w.id)));
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const renderPreview = (work: AdminWork) => {
    if (!work.outputUrl) {
      return <div className="text-xs text-dark-500">无输出</div>;
    }
    if (work.type === 'image') {
      return <img src={work.outputUrl} alt={work.name} loading="lazy" decoding="async" className="h-16 w-24 rounded-xl object-cover border border-purple-500/10" />;
    }
    if (work.type === 'video') {
      return <video src={work.outputUrl} className="h-16 w-24 rounded-xl object-cover border border-purple-500/10" muted />;
    }
    return (
      <div className="h-16 w-24 rounded-xl border border-purple-500/10 bg-dark-900/60 flex items-center justify-center">
        <Music size={22} className="text-amber-300" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">内容审核与管理</h1>
          <p className="text-dark-400 mt-1">审核、筛选和管理用户生成的图片、视频、音频作品。</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <button onClick={() => setBatchReviewModal({ action: 'approved' })} className="btn-secondary flex items-center gap-1.5 text-emerald-400">
                <CheckCircle size={16} /> 批量通过 ({selected.size})
              </button>
              <button onClick={() => setBatchReviewModal({ action: 'violated' })} className="btn-secondary flex items-center gap-1.5 text-red-400">
                <XCircle size={16} /> 批量违规 ({selected.size})
              </button>
              <button onClick={() => setBatchReviewModal({ action: 'taken_down' })} className="btn-secondary flex items-center gap-1.5 text-orange-400">
                <XOctagon size={16} /> 批量下架 ({selected.size})
              </button>
            </>
          )}
          <button onClick={loadWorks} disabled={loading} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4">
        {[
          { label: '作品总数', value: data?.stats.total || 0, icon: FileText, tone: 'bg-purple-500/20 text-purple-400' },
          { label: '今日新增', value: data?.stats.today || 0, icon: Activity, tone: 'bg-cyan-500/20 text-cyan-400' },
          { label: '图片', value: data?.stats.image || 0, icon: Image, tone: 'bg-emerald-500/20 text-emerald-400' },
          { label: '视频', value: data?.stats.video || 0, icon: Video, tone: 'bg-pink-500/20 text-pink-400' },
          { label: '音频', value: data?.stats.audio || 0, icon: Music, tone: 'bg-amber-500/20 text-amber-400' },
          { label: '失败', value: data?.stats.failed || 0, icon: Trash2, tone: 'bg-red-500/20 text-red-400' },
          { label: '待审核', value: data?.stats.pendingReview || 0, icon: RefreshCw, tone: 'bg-yellow-500/20 text-yellow-400' },
          { label: '违规', value: data?.stats.violated || 0, icon: XCircle, tone: 'bg-red-500/20 text-red-400' },
          { label: '已下架', value: data?.stats.takenDown || 0, icon: XOctagon, tone: 'bg-orange-500/20 text-orange-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg ${item.tone} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-dark-500">{item.label}</p>
                  <p className="text-xl font-bold text-dark-100">{Number(item.value).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="glass rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_130px_130px_130px_auto] gap-3 mb-5">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
              placeholder="搜索作品名、模型、用户、提示词"
              className="input-field pl-10"
            />
          </div>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="input-field">
            <option value="">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field">
            <option value="">全部状态</option>
            <option value="complete">完成</option>
            <option value="pending">处理中</option>
            <option value="failed">失败</option>
          </select>
          <select value={reviewStatus} onChange={(e) => { setReviewStatus(e.target.value); setPage(1); }} className="input-field">
            <option value="">全部审核</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="violated">违规</option>
            <option value="taken_down">已下架</option>
          </select>
          <button onClick={applySearch} className="btn-primary">搜索</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-dark-500 border-b border-purple-500/10">
                <th className="pb-3 px-3 font-medium w-10">
                  <input type="checkbox" checked={data ? selected.size === data.list.length && data.list.length > 0 : false} onChange={toggleSelectAll} className="rounded" />
                </th>
                <th className="pb-3 px-4 font-medium">作品</th>
                <th className="pb-3 px-4 font-medium">用户</th>
                <th className="pb-3 px-4 font-medium">类型/审核</th>
                <th className="pb-3 px-4 font-medium">模型</th>
                <th className="pb-3 px-4 font-medium">创建时间</th>
                <th className="pb-3 px-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-500">加载中...</td>
                </tr>
              )}
              {!loading && data?.list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-dark-500">暂无作品</td>
                </tr>
              )}
              {!loading && data?.list.map((work) => {
                const rowHighlight = work.reviewStatus === 'violated' ? 'bg-red-500/5' : work.reviewStatus === 'taken_down' ? 'bg-orange-500/5' : '';
                return (
                  <tr key={work.id} className={`border-b border-purple-500/5 hover:bg-purple-500/5 ${rowHighlight}`}>
                    <td className="py-4 px-3">
                      <input type="checkbox" checked={selected.has(work.id)} onChange={() => toggleSelect(work.id)} className="rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3 min-w-[260px]">
                        {renderPreview(work)}
                        <div>
                          <p className="font-medium text-dark-100 line-clamp-1">{work.name}</p>
                          <p className="text-xs text-dark-500 font-mono">{work.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-dark-200">{work.username || `用户 ${work.userId}`}</p>
                      <p className="text-xs text-dark-500">{work.email || '-'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 w-fit">{typeLabels[work.type]}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs border w-fit ${reviewStatusTones[work.reviewStatus] || ''}`}>
                          {reviewStatusLabels[work.reviewStatus] || work.reviewStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-dark-300">{work.model || '-'}</p>
                      <p className="text-xs text-dark-500">{work.provider || '-'}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-dark-400">{new Date(work.createdAt).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-1">
                        {work.status === 'complete' && REVIEW_ACTIONS.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.value}
                              onClick={() => setReviewModal({ work })}
                              className={`p-2 rounded-lg ${action.color}`}
                              title={action.label}
                            >
                              <Icon size={16} />
                            </button>
                          );
                        })}
                        <button onClick={() => viewDetail(work.id)} className="p-2 rounded-lg hover:bg-purple-500/10 text-dark-400 hover:text-purple-400" title="详情">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => deleteWork(work)} className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400" title="删除">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="flex items-center justify-between mt-5 text-sm text-dark-400">
            <span>共 {data.total.toLocaleString()} 条，第 {page} / {totalPages} 页</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary disabled:opacity-40">上一页</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn-secondary disabled:opacity-40">下一页</button>
            </div>
          </div>
        )}
      </section>

      {/* 审核弹窗 - 单个 */}
      {reviewModal && (
        <ReviewModal
          work={reviewModal.work}
          onReview={(status, reason) => reviewWork(reviewModal.work.id, status, reason)}
          onClose={() => setReviewModal(null)}
        />
      )}

      {/* 审核弹窗 - 批量 */}
      {batchReviewModal && (
        <BatchReviewModal
          action={batchReviewModal.action}
          count={selected.size}
          onConfirm={(reason) => batchReview(batchReviewModal.action, reason)}
          onClose={() => setBatchReviewModal(null)}
        />
      )}

      {/* 详情弹窗 */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            {detailLoading ? (
              <div className="py-16 text-center text-dark-400">加载中...</div>
            ) : detail && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-dark-100">{detail.name}</h2>
                    <p className="text-sm text-dark-500 mt-1">
                      {detail.username || `用户 ${detail.userId}`} · {typeLabels[detail.type]} · {statusLabels[detail.status]}
                    </p>
                  </div>
                  <button onClick={() => setDetail(null)} className="btn-secondary">关闭</button>
                </div>

                {/* 审核状态卡片 */}
                <div className={`rounded-2xl border p-4 ${reviewStatusTones[detail.reviewStatus] || ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">审核状态：{reviewStatusLabels[detail.reviewStatus] || detail.reviewStatus}</p>
                      {detail.reviewReason && <p className="text-xs mt-1 opacity-80">原因：{detail.reviewReason}</p>}
                    </div>
                    {detail.reviewedByUsername && (
                      <p className="text-xs opacity-60">审核人：{detail.reviewedByUsername} · {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString() : '-'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
                  <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4">
                    {detail.outputUrl && detail.type === 'image' && <img src={detail.outputUrl} alt={detail.name} className="w-full rounded-xl object-cover" />}
                    {detail.outputUrl && detail.type === 'video' && <video src={detail.outputUrl} controls className="w-full rounded-xl" />}
                    {detail.outputUrl && detail.type === 'audio' && <audio src={detail.outputUrl} controls className="w-full" />}
                    {!detail.outputUrl && <p className="text-sm text-dark-500">无输出地址</p>}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: '用户作品', value: detail.userStats?.totalWorks || 0 },
                        { label: '用户消费', value: `${(detail.userStats?.totalSpent || 0).toLocaleString()} 积分` },
                        { label: '用户调用', value: `${detail.userStats?.totalCalls || 0} 次` },
                        { label: '作品状态', value: statusLabels[detail.status] },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-dark-900/40 border border-purple-500/10 p-3">
                          <p className="text-xs text-dark-500">{item.label}</p>
                          <p className="text-base font-semibold text-dark-100 mt-1">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4">
                      <p className="text-sm font-semibold text-dark-100 mb-3">生成参数</p>
                      <pre className="text-xs text-dark-300 whitespace-pre-wrap break-all">{JSON.stringify(detail.inputParams, null, 2)}</pre>
                    </div>
                    <div className="rounded-2xl bg-dark-900/40 border border-purple-500/10 p-4 text-sm text-dark-400 space-y-2">
                      <p>模型：{detail.model || '-'}</p>
                      <p>服务商：{detail.provider || '-'}</p>
                      <p>输出地址：{detail.outputUrl || '-'}</p>
                      <p>创建时间：{new Date(detail.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      {detail.status === 'complete' && REVIEW_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.value}
                            onClick={() => { setDetail(null); setReviewModal({ work: detail }); }}
                            className={`px-4 py-2.5 rounded-xl border ${action.color}`}
                          >
                            <Icon size={16} className="inline mr-1.5" />
                            {action.label}
                          </button>
                        );
                      })}
                      <button onClick={() => deleteWork(detail)} className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20">
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* 单个审核弹窗 */
function ReviewModal({ work, onReview, onClose }: { work: AdminWork; onReview: (status: 'approved' | 'violated' | 'taken_down', reason: string) => void; onClose: () => void }) {
  const [action, setAction] = useState<'approved' | 'violated' | 'taken_down'>('approved');
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-5">
        <h3 className="text-lg font-bold text-dark-100">审核作品</h3>
        <p className="text-sm text-dark-400">作品：{work.name}</p>

        <div className="space-y-3">
          <p className="text-sm text-dark-300 font-medium">选择审核结果：</p>
          <div className="grid grid-cols-3 gap-3">
            {REVIEW_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.value}
                  onClick={() => setAction(a.value)}
                  className={`p-3 rounded-xl border text-center transition ${action === a.value ? reviewStatusTones[a.value] + ' ring-2 ring-purple-500/30' : 'border-purple-500/10 text-dark-400 hover:border-purple-500/20'}`}
                >
                  <Icon size={22} className="mx-auto mb-1.5" />
                  <span className="text-sm">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-dark-300 font-medium">审核原因（可选）：</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="输入审核原因，如：违规内容描述..."
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={() => onReview(action, reason)} className="btn-primary">确认审核</button>
        </div>
      </div>
    </div>
  );
}

/* 批量审核弹窗 */
function BatchReviewModal({ action, count, onConfirm, onClose }: { action: 'approved' | 'violated' | 'taken_down'; count: number; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-3xl w-full max-w-lg p-6 space-y-5">
        <h3 className="text-lg font-bold text-dark-100">批量审核</h3>
        <p className="text-sm text-dark-400">
          将 {count} 条作品标记为「<span className={reviewStatusTones[action].split(' ').find((c) => c.startsWith('text-'))}>{reviewStatusLabels[action]}</span>」
        </p>

        <div className="space-y-2">
          <p className="text-sm text-dark-300 font-medium">审核原因（可选）：</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="输入审核原因..."
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={() => onConfirm(reason)} className="btn-primary">确认批量审核</button>
        </div>
      </div>
    </div>
  );
}
