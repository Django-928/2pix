import { Router, type Request, type Response } from 'express';
import db from '../../db/index.js';
import { authMiddleware, getClientIp, logOperation, requirePermission } from '../../utils/auth.js';
import { decrypt, encrypt, maskSecret, SECRET_MASK } from '../../utils/cryptoUtils.js';
import { defaultSystemConfig, sanitizeSystemConfig } from '../../utils/systemConfig.js';

const router = Router();

/** 需要脱敏的配置字段路径，支持 dot notation；数组用 [*] 表示 */
const SENSITIVE_PATHS: Record<string, string[]> = {
  payment: ['alipay.privateKey', 'alipay.publicKey', 'wechat.apiV3Key', 'wechat.privateKey'],
  providers: ['providers[*].apiKey'],
};

/**
 * 递归脱敏对象中的敏感字段
 * 支持 providers[*].apiKey 格式的数组元素路径
 */
function maskValue(obj: Record<string, unknown>, dotPaths: string[]): Record<string, unknown> {
  const result = { ...obj };
  for (const dotPath of dotPaths) {
    const arrayMatch = dotPath.match(/^([\w.]+)\[\*\]\.(\w+)$/);
    if (arrayMatch) {
      // 数组路径：如 providers[*].apiKey
      const parentPath = arrayMatch[1]; // providers
      const field = arrayMatch[2]; // apiKey
      const keys = parentPath.split('.');
      let parent = result;
      for (const k of keys) {
        if (parent && typeof parent[k] === 'object' && parent[k] !== null) {
          parent = parent[k] as Record<string, unknown>;
        } else {
          parent = {} as Record<string, unknown>;
          break;
        }
      }
      if (Array.isArray(parent)) {
        for (const item of parent) {
          if (item && typeof item === 'object' && field in item && typeof item[field] === 'string') {
            const raw = decrypt(item[field] as string);
            if (raw) {
              item[field] = maskSecret(raw);
            }
          }
        }
      }
    } else {
      // 普通路径：如 alipay.privateKey
      const keys = dotPath.split('.');
      let current: Record<string, unknown> = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current && typeof current[keys[i]] === 'object' && current[keys[i]] !== null) {
          current = current[keys[i]] as Record<string, unknown>;
        } else {
          current = {} as Record<string, unknown>;
          break;
        }
      }
      const lastKey = keys[keys.length - 1];
      if (current && lastKey in current && typeof current[lastKey] === 'string') {
        const raw = decrypt(current[lastKey] as string);
        if (raw) {
          current[lastKey] = maskSecret(raw);
        }
      }
    }
  }
  return result;
}

/**
 * 递归处理 PUT 请求的敏感字段：
 * - 如果字段值 === SECRET_MASK 占位符，从数据库原值解密后保留
 * - 否则加密新值
 * - 空值不处理
 */
function encryptValue(obj: Record<string, unknown>, dotPaths: string[], originalObj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  for (const dotPath of dotPaths) {
    const arrayMatch = dotPath.match(/^([\w.]+)\[\*\]\.(\w+)$/);
    if (arrayMatch) {
      // 数组路径：如 providers[*].apiKey
      const parentPath = arrayMatch[1];
      const field = arrayMatch[2];
      const keys = parentPath.split('.');
      let parent = result;
      let origParent = originalObj;
      for (const k of keys) {
        if (parent && typeof parent[k] === 'object' && parent[k] !== null) {
          parent = parent[k] as Record<string, unknown>;
        } else {
          parent = {} as Record<string, unknown>;
          break;
        }
        if (origParent && typeof origParent[k] === 'object' && origParent[k] !== null) {
          origParent = origParent[k] as Record<string, unknown>;
        } else {
          origParent = {} as Record<string, unknown>;
        }
      }
      if (Array.isArray(parent)) {
        const origArr = Array.isArray(origParent) ? origParent : [];
        for (let idx = 0; idx < parent.length; idx++) {
          const item = parent[idx] as Record<string, unknown>;
          const origItem = origArr[idx] as Record<string, unknown> | undefined;
          if (item && field in item && typeof item[field] === 'string') {
            const val = item[field] as string;
            if (val === SECRET_MASK || val === '') {
              if (origItem && typeof origItem[field] === 'string' && origItem[field]) {
                item[field] = origItem[field];
              }
            } else {
              item[field] = encrypt(val);
            }
          }
        }
      }
    } else {
      // 普通路径
      const keys = dotPath.split('.');
      let current: Record<string, unknown> = result;
      let origCurrent: Record<string, unknown> = originalObj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current && typeof current[keys[i]] === 'object' && current[keys[i]] !== null) {
          current = current[keys[i]] as Record<string, unknown>;
        }
        if (origCurrent && typeof origCurrent[keys[i]] === 'object' && origCurrent[keys[i]] !== null) {
          origCurrent = origCurrent[keys[i]] as Record<string, unknown>;
        } else {
          origCurrent = {} as Record<string, unknown>;
        }
      }
      const lastKey = keys[keys.length - 1];
      if (current && lastKey in current && typeof current[lastKey] === 'string') {
        const val = current[lastKey] as string;
        if (val === SECRET_MASK || val === '') {
          const origVal = origCurrent?.[lastKey];
          if (typeof origVal === 'string' && origVal) {
            current[lastKey] = origVal;
          }
        } else {
          current[lastKey] = encrypt(val);
        }
      }
    }
  }
  return result;
}

const defaultConfigs: Record<string, { description: string; value: Record<string, unknown> }> = {
  system: {
    description: '系统基础运营参数',
    value: { ...defaultSystemConfig },
  },
  payment: {
    description: '支付宝、微信支付参数配置',
    value: {
      mode: 'mock',
      alipay: {
        enabled: false,
        appId: '',
        gateway: 'https://openapi.alipay.com/gateway.do',
        notifyUrl: '',
        returnUrl: '',
        publicKey: '',
        privateKey: '',
      },
      wechat: {
        enabled: false,
        appId: '',
        mchId: '',
        apiV3Key: '',
        certSerialNo: '',
        notifyUrl: '',
        privateKey: '',
      },
    },
  },
  providers: {
    description: '上游模型聚合平台配置',
    value: {
      activeProvider: 'kie.ai',
      providers: [
        {
          id: 'kie-ai',
          name: 'kie.ai',
          enabled: false,
          baseUrl: 'https://api.kie.ai',
          apiKey: '',
          timeoutSeconds: 120,
          costMultiplier: 1,
          models: [
            { localModel: 'gpt-image-2', upstreamModel: 'kie-image', category: 'image', enabled: true },
            { localModel: 'sora-2', upstreamModel: 'kie-video', category: 'video', enabled: true },
            { localModel: 'suno-v4-5', upstreamModel: 'kie-music', category: 'audio', enabled: true },
          ],
        },
      ],
    },
  },
};

router.use(authMiddleware);

function ensureDefaultConfig(key: string) {
  const existing = db.prepare('SELECT config_key, config_value, description, updated_at FROM admin_configs WHERE config_key = ?').get(key);
  if (existing) return existing;

  const def = defaultConfigs[key];
  if (!def) return null;

  db.prepare(`
    INSERT INTO admin_configs (config_key, config_value, description)
    VALUES (?, ?, ?)
  `).run(key, JSON.stringify(def.value), def.description);

  return db.prepare('SELECT config_key, config_value, description, updated_at FROM admin_configs WHERE config_key = ?').get(key);
}

function parseConfig(row: { config_key: string; config_value: string; description?: string; updated_at?: string }) {
  return {
    key: row.config_key,
    value: JSON.parse(row.config_value || '{}'),
    description: row.description,
    updated_at: row.updated_at,
  };
}

function toAuditValue(key: string, value: Record<string, unknown>) {
  const sensitivePaths = SENSITIVE_PATHS[key];
  if (!sensitivePaths) return value;
  return maskValue(value, sensitivePaths);
}

function createConfigDiff(before: unknown, after: unknown, path = ''): Array<{ path: string; before: unknown; after: unknown }> {
  const beforeRecord = before && typeof before === 'object' ? before as Record<string, unknown> : null;
  const afterRecord = after && typeof after === 'object' ? after as Record<string, unknown> : null;

  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeArray = Array.isArray(before) ? before : [];
    const afterArray = Array.isArray(after) ? after : [];
    const maxLength = Math.max(beforeArray.length, afterArray.length);
    const diffs: Array<{ path: string; before: unknown; after: unknown }> = [];
    for (let i = 0; i < maxLength; i++) {
      diffs.push(...createConfigDiff(beforeArray[i], afterArray[i], `${path}[${i}]`));
    }
    return diffs;
  }

  if (beforeRecord || afterRecord) {
    const keys = new Set([...Object.keys(beforeRecord || {}), ...Object.keys(afterRecord || {})]);
    const diffs: Array<{ path: string; before: unknown; after: unknown }> = [];
    for (const itemKey of keys) {
      const nextPath = path ? `${path}.${itemKey}` : itemKey;
      diffs.push(...createConfigDiff(beforeRecord?.[itemKey], afterRecord?.[itemKey], nextPath));
    }
    return diffs;
  }

  if (JSON.stringify(before) !== JSON.stringify(after)) {
    return [{ path, before, after }];
  }
  return [];
}

router.get('/:key', requirePermission('system:config'), async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key;
    const row = ensureDefaultConfig(key) as { config_key: string; config_value: string; description?: string; updated_at?: string } | null;
    if (!row) {
      res.status(404).json({ success: false, error: '配置不存在' });
      return;
    }

    const parsed = parseConfig(row);
    // 对敏感字段脱敏后再返回
    const sensitivePaths = SENSITIVE_PATHS[key];
    if (sensitivePaths) {
      parsed.value = maskValue(parsed.value as Record<string, unknown>, sensitivePaths);
    }

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Get admin config error:', error);
    res.status(500).json({ success: false, error: '获取配置失败' });
  }
});

router.put('/:key', requirePermission('system:config'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!defaultConfigs[key]) {
      res.status(404).json({ success: false, error: '配置不存在' });
      return;
    }

    if (!value || typeof value !== 'object') {
      res.status(400).json({ success: false, error: '配置内容必须为对象' });
      return;
    }

    ensureDefaultConfig(key);

    // 读取数据库中的原值，用于占位符保留
    const origRow = db.prepare('SELECT config_value FROM admin_configs WHERE config_key = ?').get(key) as { config_value: string } | undefined;
    const originalValue = origRow ? JSON.parse(origRow.config_value || '{}') : {};

    // 处理敏感字段的加密/保留
    const sensitivePaths = SENSITIVE_PATHS[key];
    const normalizedValue = key === 'system' ? sanitizeSystemConfig(value) : value;
    const processedValue = sensitivePaths ? encryptValue(normalizedValue, sensitivePaths, originalValue) : normalizedValue;
    const auditBefore = toAuditValue(key, originalValue);
    const auditAfter = toAuditValue(key, processedValue as Record<string, unknown>);
    const diff = createConfigDiff(auditBefore, auditAfter).slice(0, 100);

    db.prepare(`
      UPDATE admin_configs
      SET config_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE config_key = ?
    `).run(JSON.stringify(processedValue), req.user?.id, key);

    logOperation(
      req.user?.id,
      req.user?.username,
      `update_${key}_config`,
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      {
        key,
        changedFields: diff.length,
        diff,
      }
    );

    const row = db.prepare('SELECT config_key, config_value, description, updated_at FROM admin_configs WHERE config_key = ?').get(key) as {
      config_key: string;
      config_value: string;
      description?: string;
      updated_at?: string;
    };

    // 返回时也脱敏
    const parsed = parseConfig(row);
    if (sensitivePaths) {
      parsed.value = maskValue(parsed.value as Record<string, unknown>, sensitivePaths);
    }

    res.json({ success: true, message: '配置已保存', data: parsed });
  } catch (error) {
    console.error('Update admin config error:', error);
    res.status(500).json({ success: false, error: '保存配置失败' });
  }
});

export default router;
