import { Send, Loader2 } from 'lucide-react';
import type { AIModel } from '@/data/models';

/* ── 模型 Logo（大图标） ── */
export function ModelLogo({ model }: { model: AIModel }) {
  if (model.icon.startsWith('http')) {
    return (
      <img src={model.icon} alt={model.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover" />
    );
  }
  return (
    <span className="text-4xl select-none" role="img" aria-label={model.name}>
      {model.icon}
    </span>
  );
}

/* ── 模型描述卡片 ── */
export function DescriptionCard({ model }: { model: AIModel }) {
  return (
    <div className="text-center space-y-1">
      <h3 className="text-lg font-semibold text-[#f0f0f2]" style={{ fontFamily: 'var(--font-display)' }}>
        {model.name}
      </h3>
      <p className="text-sm text-[#a1a1aa] max-w-md">{model.description}</p>
      {model.isNew && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(139,92,246,0.15)] text-[#a78bfa] text-xs font-medium">
          新
        </span>
      )}
    </div>
  );
}

/* ── 参数胶囊 ── */
export function ParamCapsule({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#71717a] whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-2 py-0.5 rounded-md text-xs transition-all ${
              value === opt
                ? 'bg-[rgba(139,92,246,0.2)] text-[#a78bfa] border border-[rgba(139,92,246,0.3)]'
                : 'text-[#a1a1aa] hover:bg-white/[0.05] hover:text-[#e4e4e7]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 发送按钮 ── */
export function SendButton({ onClick, disabled = false, loading = false, text = '生成' }: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        boxShadow: '0 0 20px rgba(139,92,246,0.25)',
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      {text}
    </button>
  );
}

/* ── 费用提示 ── */
export function CostHint({ text }: { text: string }) {
  return <span className="text-xs text-[#71717a]">{text}</span>;
}
