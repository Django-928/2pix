import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 未捕获错误:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-100 mb-2">页面出现了问题</h3>
          <p className="text-sm text-dark-500 max-w-md mb-6">
            {this.state.error?.message || '发生了未知错误，请刷新页面重试'}
          </p>
          <button onClick={this.handleReset} className="btn-primary flex items-center gap-2">
            <RefreshCw size={16} />
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
