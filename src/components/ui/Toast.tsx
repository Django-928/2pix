import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: Toast['type'], duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  const icons: Record<Toast['type'], typeof Info> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const tones: Record<Toast['type'], string> = {
    success: 'border-emerald-500/30 bg-emerald-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
    info: 'border-cyan-500/30 bg-cyan-500/10',
  };

  const iconColors: Record<Toast['type'], string> = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-cyan-400',
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${tones[t.type]}`}
            >
              <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconColors[t.type]}`} />
              <p className="text-sm text-dark-100 flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="flex-shrink-0 text-dark-500 hover:text-dark-300">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
}
