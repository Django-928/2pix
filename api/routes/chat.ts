import express, { type Request, type Response } from 'express';
import { generateWithProvider } from '../services/providerService.js';
import { apiKeyOrAuthMiddleware } from '../utils/auth.js';
import db from '../db/index.js';

const router = express.Router();

router.post('/message', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  const { messages, model } = req.body;

  try {
    const lastMessage = Array.isArray(messages) ? messages[messages.length - 1] : null;
    const prompt = typeof lastMessage === 'string' ? lastMessage : lastMessage?.content || '';
    const result = await generateWithProvider({
      category: 'chat',
      localModel: model || 'gpt-5.5',
      prompt,
      params: { messages },
    });

    res.status(200).json({
      success: true,
      id: result.id,
      content: result.content || '上游模型未返回文本内容。',
      model,
      providerMode: result.providerMode,
      provider: result.provider,
      upstreamModel: result.upstreamModel,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
    });
  }
});

router.get('/conversations', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const list = db.prepare(`
      SELECT c.id, c.title, c.model, c.created_at, c.updated_at
      FROM conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT 100
    `).all(userId) as Array<Record<string, unknown>>;

    const conversations = list.map((conv) => {
      const messages = db.prepare(`
        SELECT id as msgId, role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC
      `).all(conv.id) as Array<{ msgId: number; role: string; content: string; created_at: string }>;
      return {
        id: String(conv.id),
        title: conv.title,
        model: conv.model,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        messages: messages.map((m) => ({
          id: `msg-${m.msgId}`,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        })),
      };
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: '获取对话历史失败' });
  }
});

router.post('/conversations', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, model } = req.body;
    const result = db.prepare(`
      INSERT INTO conversations (user_id, title, model) VALUES (?, ?, ?)
    `).run(req.user?.id, title || '新对话', model || '');
    res.status(201).json({
      success: true,
      data: {
        id: String(result.lastInsertRowid),
        title: title || '新对话',
        model: model || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, error: '创建对话失败' });
  }
});

router.post('/conversations/:id/messages', apiKeyOrAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;
    const convId = parseInt(id, 10);

    const conv = db.prepare('SELECT id, user_id FROM conversations WHERE id = ?').get(convId) as { id: number; user_id: number } | undefined;
    if (!conv || conv.user_id !== req.user?.id) {
      res.status(404).json({ success: false, error: '对话不存在' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)
    `).run(convId, role || 'user', content || '');

    // 更新会话标题（如果是第一条用户消息且标题还是默认值）
    if (role === 'user') {
      const convInfo = db.prepare('SELECT title FROM conversations WHERE id = ?').get(convId) as { title: string } | undefined;
      if (convInfo?.title === '新对话') {
        db.prepare('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
          content.slice(0, 18), convId
        );
      } else {
        db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(convId);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: `msg-${result.lastInsertRowid}`,
        role: role || 'user',
        content: content || '',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ success: false, error: '添加消息失败' });
  }
});

export default router;
