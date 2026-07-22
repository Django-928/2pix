import { Check, Copy, Key, Trash2 } from 'lucide-react';
import type { ApiKeyItem, CreatedApiKey } from './types';

interface ProfileApiTabProps {
  apiKeys: ApiKeyItem[];
  apiKeyLoading: boolean;
  newKeyName: string;
  createdKey: CreatedApiKey | null;
  apiKeyNotice: string;
  copied: string;
  onNewKeyNameChange: (name: string) => void;
  onCreateApiKey: () => void;
  onToggleApiKey: (id: number, enabled: boolean) => void;
  onDeleteApiKey: (id: number) => void;
  onCloseCreatedKey: () => void;
  onCopy: (text: string, key: string) => void;
}

export default function ProfileApiTab({
  apiKeys,
  apiKeyLoading,
  newKeyName,
  createdKey,
  apiKeyNotice,
  copied,
  onNewKeyNameChange,
  onCreateApiKey,
  onToggleApiKey,
  onDeleteApiKey,
  onCloseCreatedKey,
  onCopy,
}: ProfileApiTabProps) {
  return (
    <section className="rounded-3xl bg-[#111] border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#f5f5f5]">API 密钥</h2>
          <p className="text-xs text-[#666] mt-1">用于外部系统调用 2PIX 模型服务</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          value={newKeyName}
          onChange={(e) => onNewKeyNameChange(e.target.value)}
          placeholder="输入密钥名称（如：Web 应用）"
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#0d0d0d] border border-white/[0.08] text-sm text-[#eee] outline-none focus:border-cyan-500/40"
        />
        <button
          onClick={onCreateApiKey}
          disabled={apiKeyLoading}
          className="px-4 py-2.5 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] disabled:opacity-50"
        >
          {apiKeyLoading ? '创建中...' : '创建密钥'}
        </button>
      </div>

      {apiKeyNotice && (
        <div
          className={`mb-4 rounded-2xl px-4 py-3 text-sm border ${
            apiKeyNotice.includes('成功')
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          }`}
        >
          {apiKeyNotice}
        </div>
      )}

      {createdKey && (
        <div className="mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-cyan-200">密钥创建成功，请立即保存</p>
            <button onClick={onCloseCreatedKey} className="text-xs text-[#888] hover:text-white">
              关闭
            </button>
          </div>
          <p className="text-xs text-[#888] mb-2">此完整密钥仅显示一次，关闭后无法再查看</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-cyan-500/20 text-amber-300 text-sm break-all">
              {createdKey.key}
            </code>
            <button
              onClick={() => onCopy(createdKey.key, 'created-key')}
              className="px-4 py-3 rounded-xl bg-[#8b5cf6] text-white"
            >
              {copied === 'created-key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apiKeys.length === 0 && (
          <div className="py-12 rounded-2xl bg-[#171717] border border-white/[0.06] flex flex-col items-center justify-center">
            <Key className="w-8 h-8 text-[#444] mb-2" />
            <p className="text-sm text-[#666]">暂无 API 密钥</p>
            <p className="text-xs text-[#555] mt-1">创建密钥后可用于外部系统接入</p>
          </div>
        )}
        {apiKeys.map((api) => (
          <div
            key={api.id}
            className="rounded-2xl bg-[#171717] border border-white/[0.08] p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-[#eee]">{api.name}</p>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    api.enabled ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                  }`}
                >
                  {api.enabled ? '启用' : '停用'}
                </span>
              </div>
              <p className="text-xs text-[#777] mt-1">
                {api.key_prefix}************ · {api.scope}
              </p>
              <p className="text-[11px] text-[#555] mt-1">
                最近使用：{api.last_used_at ? new Date(api.last_used_at).toLocaleString() : '从未使用'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onToggleApiKey(api.id, !api.enabled)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  api.enabled
                    ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20'
                    : 'bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/20'
                }`}
              >
                {api.enabled ? '停用' : '启用'}
              </button>
              <button
                onClick={() => onDeleteApiKey(api.id)}
                className="p-2 rounded-xl bg-[#222] text-[#aaa] hover:text-red-300 hover:bg-red-500/10 transition-all"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
