import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { authMiddleware, generateApiKey, hashApiKey, getClientIp, logOperation } from '../utils/auth.js';

const router = Router();

router.use(authMiddleware);

interface ApiKeyRow {
  id: number;
  user_id: number;
  name: string;
  key_hash: string;
  key_prefix: string;
  scope: string;
  enabled: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const list = db.prepare(`
      SELECT id, name, key_prefix, scope, enabled, last_used_at, created_at
      FROM api_keys
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user?.id) as Array<Pick<ApiKeyRow, 'id' | 'name' | 'key_prefix' | 'scope' | 'enabled' | 'last_used_at' | 'created_at'>>;

    res.json({
      success: true,
      data: list.map((item) => ({
        ...item,
        enabled: !!item.enabled,
      })),
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ success: false, error: '获取 API 密钥失败' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, scope } = req.body;
    const normalizedName = String(name || '').trim();
    if (!normalizedName || normalizedName.length > 50) {
      res.status(400).json({ success: false, error: '密钥名称不能为空且不超过 50 个字符' });
      return;
    }

    const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?').get(req.user?.id) as { count: number };
    if (keyCount.count >= 10) {
      res.status(400).json({ success: false, error: '每个用户最多创建 10 个 API 密钥' });
      return;
    }

    const fullKey = generateApiKey();
    const keyHash = hashApiKey(fullKey);
    const keyPrefix = fullKey.slice(0, 16);
    const scopeValue = scope || 'chat,image,video,audio';

    const result = db.prepare(`
      INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scope)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user?.id, normalizedName, keyHash, keyPrefix, scopeValue);

    logOperation(req.user?.id, req.user?.username, 'create_api_key', 'api_key', getClientIp(req), req.headers['user-agent'] || '', {
      keyId: result.lastInsertRowid,
      name: normalizedName,
      scope: scopeValue,
    });

    res.status(201).json({
      success: true,
      message: 'API 密钥创建成功，请立即保存，之后无法再次查看完整密钥',
      data: {
        id: result.lastInsertRowid,
        name: normalizedName,
        key: fullKey,
        prefix: keyPrefix,
        scope: scopeValue,
        enabled: true,
      },
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, error: '创建 API 密钥失败' });
  }
});

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { enabled, name } = req.body;
    const keyId = parseInt(id, 10);

    const existing = db.prepare('SELECT id, user_id, name, enabled FROM api_keys WHERE id = ?').get(keyId) as { id: number; user_id: number; name: string; enabled: number } | undefined;
    if (!existing || existing.user_id !== req.user?.id) {
      res.status(404).json({ success: false, error: '密钥不存在' });
      return;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (typeof enabled === 'boolean') {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }

    const normalizedName = String(name || '').trim();
    if (normalizedName) {
      if (normalizedName.length > 50) {
        res.status(400).json({ success: false, error: '密钥名称不能超过 50 个字符' });
        return;
      }
      updates.push('name = ?');
      params.push(normalizedName);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '没有要更新的字段' });
      return;
    }

    params.push(keyId);
    db.prepare(`UPDATE api_keys SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);

    logOperation(req.user?.id, req.user?.username, 'update_api_key', 'api_key', getClientIp(req), req.headers['user-agent'] || '', {
      keyId,
      name: normalizedName || existing.name,
      enabled: typeof enabled === 'boolean' ? enabled : !!existing.enabled,
    });

    res.json({ success: true, message: '密钥已更新' });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ success: false, error: '更新密钥失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const keyId = parseInt(id, 10);

    const existing = db.prepare('SELECT id, user_id, name FROM api_keys WHERE id = ?').get(keyId) as { id: number; user_id: number; name: string } | undefined;
    if (!existing || existing.user_id !== req.user?.id) {
      res.status(404).json({ success: false, error: '密钥不存在' });
      return;
    }

    db.prepare('DELETE FROM api_keys WHERE id = ?').run(keyId);

    logOperation(req.user?.id, req.user?.username, 'delete_api_key', 'api_key', getClientIp(req), req.headers['user-agent'] || '', {
      keyId,
      name: existing.name,
    });

    res.json({ success: true, message: '密钥已删除' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ success: false, error: '删除密钥失败' });
  }
});

export default router;
