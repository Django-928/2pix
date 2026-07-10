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
      activeProvider: 'rongchuan',
      providers: [
        {
          id: 'rongchuan',
          name: '融川 OneAPI',
          enabled: true,
          baseUrl: 'https://rongchuan.ai',
          apiKey: 'sk-UC4uuRrD3dvUD1xQomxJhwl0t9PMbviwhL3gvTjBTu4RFL9R',
          timeoutSeconds: 120,
          costMultiplier: 1,
          models: [
            { localModel: 'gpt-5.5', upstreamModel: 'gpt-5.5', category: 'chat', enabled: true },
            { localModel: 'gpt-5.4', upstreamModel: 'gpt-5.4', category: 'chat', enabled: true },
            { localModel: 'gpt-5.2', upstreamModel: 'gpt-5.2', category: 'chat', enabled: true },
            { localModel: 'claude-opus-4', upstreamModel: 'claude-opus-4-7', category: 'chat', enabled: true },
            { localModel: 'claude-sonnet-4', upstreamModel: 'claude-sonnet-4-6', category: 'chat', enabled: true },
            { localModel: 'gpt-image-2', upstreamModel: 'gpt-image-2', category: 'image', enabled: true },
            { localModel: 'gpt-image-1.5', upstreamModel: 'gpt-image-1.5', category: 'image', enabled: true },
            { localModel: 'gpt-image-1', upstreamModel: 'gpt-image-1', category: 'image', enabled: true },
          ],
        },
        {
          id: 'kie-ai',
          name: 'KIE AI',
          enabled: false,
          baseUrl: 'https://api.kie.ai',
          apiKey: '',
          timeoutSeconds: 180,
          costMultiplier: 1,
          models: [
            { localModel: 'grok-4-5', upstreamModel: 'grok-4-5', category: 'chat', enabled: true },
            { localModel: 'claude-sonnet-5', upstreamModel: 'claude-sonnet-5', category: 'chat', enabled: true },
            { localModel: 'seedream-4', upstreamModel: 'bytedance/seedream-v4-text-to-image', category: 'image', enabled: true },
            { localModel: 'grok-imagine', upstreamModel: 'grok-imagine/text-to-image', category: 'image', enabled: true },
            { localModel: 'flux-2', upstreamModel: 'flux-2/flex-text-to-image', category: 'image', enabled: true },
            { localModel: 'kling-2.6', upstreamModel: 'kling-2.6/text-to-video', category: 'video', enabled: true },
            { localModel: 'seedance-2', upstreamModel: 'bytedance/seedance-2-mini', category: 'video', enabled: true },
            { localModel: 'grok-video', upstreamModel: 'grok-imagine-video-1-5-preview', category: 'video', enabled: true },
            { localModel: 'happyhorse', upstreamModel: 'happyhorse-1-1', category: 'video', enabled: true },
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

/** 测试 provider 连接 */
router.post('/providers/test-connection', requirePermission('system:config'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.body;

    if (!providerId || typeof providerId !== 'string') {
      res.status(400).json({ success: false, error: '缺少 providerId' });
      return;
    }

    // 1. 从数据库读取 providers 配置
    const row = ensureDefaultConfig('providers') as { config_key: string; config_value: string } | null;
    if (!row) {
      res.status(500).json({ success: false, error: 'providers 配置不存在' });
      return;
    }

    const config = JSON.parse(row.config_value || '{}') as Record<string, unknown>;
    const providers = config.providers as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(providers)) {
      res.status(500).json({ success: false, error: 'providers 配置格式异常' });
      return;
    }

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      res.status(404).json({ success: false, error: `未找到 provider: ${providerId}` });
      return;
    }

    // 2. 读取 baseUrl 和 apiKey
    let baseUrl = (provider.baseUrl as string) || '';
    const encryptedApiKey = provider.apiKey as string;
    if (!baseUrl || !encryptedApiKey) {
      res.status(400).json({ success: false, error: '该 provider 缺少 baseUrl 或 apiKey' });
      return;
    }

    const apiKey = decrypt(encryptedApiKey);
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'apiKey 解密失败' });
      return;
    }

    // 3. 智能处理 baseUrl，确保最终请求 /v1/models
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

    // 4. 调用上游 API（10 秒超时）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const startTime = Date.now();

    let response: globalThis.Response;
    try {
      response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      const msg = fetchError instanceof Error ? fetchError.message : '未知网络错误';
      if (msg.includes('abort') || msg.includes('timeout')) {
        res.status(504).json({ success: false, error: '请求上游模型列表超时（10s）' });
      } else {
        res.status(502).json({ success: false, error: `上游请求失败: ${msg}` });
      }
      return;
    }
    clearTimeout(timeout);

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      res.status(502).json({
        success: false,
        error: `上游返回 HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      });
      return;
    }

    // 5. 解析 OpenAI 标准格式
    const body = (await response.json()) as { data?: Array<{ id: string; object?: string; owned_by?: string }> };
    if (!Array.isArray(body.data)) {
      res.status(502).json({ success: false, error: '上游返回的模型列表格式异常，缺少 data 字段' });
      return;
    }

    // 6. 记录操作日志
    logOperation(
      req.user?.id,
      req.user?.username,
      'test_provider_connection',
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { providerId, modelCount: body.data.length, latency }
    );

    // 7. 返回测试结果
    res.json({
      success: true,
      modelCount: body.data.length,
      latency,
    });
  } catch (error) {
    console.error('Test provider connection error:', error);
    res.status(500).json({ success: false, error: '测试连接失败' });
  }
});

/** 根据模型名关键词推断分类 */
function inferCategory(modelId: string): string {
  const id = modelId.toLowerCase();
  if (/dall-e|midjourney|flux|image|img|sd|stable-diffusion|paint/.test(id)) return 'image';
  if (/sora|video|cogvideo|runway|kling|vidu|luma/.test(id)) return 'video';
  if (/tts|suno|audio|music|speech/.test(id)) return 'audio';
  return 'chat';
}

/** 同步上游模型列表 */
router.post('/providers/sync-models', requirePermission('system:config'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.body;

    if (!providerId || typeof providerId !== 'string') {
      res.status(400).json({ success: false, error: '缺少 providerId' });
      return;
    }

    // 1. 从数据库读取 providers 配置
    const row = ensureDefaultConfig('providers') as { config_key: string; config_value: string } | null;
    if (!row) {
      res.status(500).json({ success: false, error: 'providers 配置不存在' });
      return;
    }

    const config = JSON.parse(row.config_value || '{}') as Record<string, unknown>;
    const providers = config.providers as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(providers)) {
      res.status(500).json({ success: false, error: 'providers 配置格式异常' });
      return;
    }

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      res.status(404).json({ success: false, error: `未找到 provider: ${providerId}` });
      return;
    }

    // 2. 读取 baseUrl 和 apiKey
    let baseUrl = (provider.baseUrl as string) || '';
    const encryptedApiKey = provider.apiKey as string;
    if (!baseUrl || !encryptedApiKey) {
      res.status(400).json({ success: false, error: '该 provider 缺少 baseUrl 或 apiKey' });
      return;
    }

    const apiKey = decrypt(encryptedApiKey);
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'apiKey 解密失败' });
      return;
    }

    // 3. 智能处理 baseUrl，确保最终请求 /v1/models
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

    // 4. 调用上游 API（15 秒超时）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response: globalThis.Response;
    try {
      response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      const msg = fetchError instanceof Error ? fetchError.message : '未知网络错误';
      if (msg.includes('abort') || msg.includes('timeout')) {
        res.status(504).json({ success: false, error: '请求上游模型列表超时（15s）' });
      } else {
        res.status(502).json({ success: false, error: `上游请求失败: ${msg}` });
      }
      return;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      res.status(502).json({
        success: false,
        error: `上游返回 HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      });
      return;
    }

    // 5. 解析 OpenAI 标准格式
    const body = (await response.json()) as { data?: Array<{ id: string; object?: string; owned_by?: string }> };
    if (!Array.isArray(body.data)) {
      res.status(502).json({ success: false, error: '上游返回的模型列表格式异常，缺少 data 字段' });
      return;
    }

    // 6. 合并模型（保留已有、添加新发现）
    const existingModels = Array.isArray(provider.models)
      ? (provider.models as Array<Record<string, unknown>>)
      : [];

    const existingUpstreamSet = new Set(
      existingModels.map((m) => m.upstreamModel as string)
    );

    const syncedModels = existingModels.map((m) => ({
      localModel: m.localModel as string,
      upstreamModel: m.upstreamModel as string,
      category: (m.category as string) || 'chat',
      enabled: m.enabled !== false,
      isNew: false,
    }));

    let added = 0;
    for (const model of body.data) {
      if (!model.id) continue;
      if (existingUpstreamSet.has(model.id)) continue;

      syncedModels.push({
        localModel: model.id,
        upstreamModel: model.id,
        category: inferCategory(model.id),
        enabled: true,
        isNew: true,
      });
      added++;
    }

    const total = syncedModels.length;

    // 7. 保存回数据库（只更新 models 数组）
    const cleanModels = syncedModels.map(({ isNew, ...rest }) => rest);
    provider.models = cleanModels;
    config.providers = providers;

    db.prepare(`
      UPDATE admin_configs
      SET config_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE config_key = 'providers'
    `).run(JSON.stringify(config), req.user?.id);

    // 记录操作日志
    logOperation(
      req.user?.id,
      req.user?.username,
      'sync_provider_models',
      'system',
      getClientIp(req),
      req.headers['user-agent'] || '',
      { providerId, total, added }
    );

    // 8. 返回同步结果
    res.json({
      success: true,
      data: {
        total,
        added,
        existing: total - added,
        models: syncedModels,
      },
    });
  } catch (error) {
    console.error('Sync provider models error:', error);
    res.status(500).json({ success: false, error: '同步模型列表失败' });
  }
});

export default router;
