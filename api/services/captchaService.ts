import crypto from 'crypto';

interface CaptchaItem {
  code: string;
  expiresAt: number;
}

const store = new Map<string, CaptchaItem>();

const TTL_MS = 5 * 60 * 1000; // 5 分钟有效期
const CLEANUP_INTERVAL_MS = 60 * 1000; // 每分钟清理一次

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createCaptcha(): { id: string; code: string } {
  const id = crypto.randomUUID();
  const code = generateCode();
  store.set(id, { code, expiresAt: Date.now() + TTL_MS });
  return { id, code };
}

export function validateCaptcha(id: string, code: string): boolean {
  const item = store.get(id);
  if (!item) return false;
  if (Date.now() > item.expiresAt) {
    store.delete(id);
    return false;
  }
  const valid = item.code.toLowerCase() === code.toLowerCase();
  if (valid) {
    store.delete(id);
  }
  return valid;
}

function cleanup() {
  const now = Date.now();
  for (const [id, item] of store.entries()) {
    if (now > item.expiresAt) {
      store.delete(id);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS).unref();
