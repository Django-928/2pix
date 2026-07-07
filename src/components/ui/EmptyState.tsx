import { cn } from '@/lib/utils';
import { FileQuestion, Inbox, SearchX, WifiOff } from 'lucide-react';

interface EmptyStateProps {
  icon?: typeof Inbox;
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title = '暂无数据', description = '当前没有可显示的内容', className, action }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-dark-800/60 flex items-center justify-center mb-4">
        <Icon size={32} className="text-dark-500" />
      </div>
      <h3 className="text-base font-medium text-dark-200 mb-1">{title}</h3>
      <p className="text-sm text-dark-500 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function NoData({ title, description, className }: Omit<EmptyStateProps, 'icon'>) {
  return <EmptyState icon={FileQuestion} title={title || '暂无数据'} description={description} className={className} />;
}

export function NoSearchResult({ keyword, className }: { keyword?: string; className?: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title="未找到结果"
      description={keyword ? `没有找到与"${keyword}"相关的内容` : '请尝试调整搜索条件或筛选器'}
      className={className}
    />
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={WifiOff}
      title="网络异常"
      description="请检查网络连接后重试"
      action={onRetry ? (
        <button onClick={onRetry} className="btn-primary">重新加载</button>
      ) : undefined}
    />
  );
}
