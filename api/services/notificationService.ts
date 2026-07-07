import db from '../db/index.js';

export interface CreateNotificationInput {
  userId: number;
  type?: string;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string | number;
}

export function createNotification(input: CreateNotificationInput) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, content, related_type, related_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.userId,
    input.type || 'system',
    input.title,
    input.content || '',
    input.relatedType || null,
    input.relatedId === undefined || input.relatedId === null ? null : String(input.relatedId)
  );
}
