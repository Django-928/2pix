import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_MASK = '••••••••';

function getEncryptionKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY || '2pix-default-config-encryption-key-2026!';
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * AES-256-GCM 加密，返回格式：iv:authTag:ciphertext（均为 base64）
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * AES-256-GCM 解密
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext; // 未加密的明文直接返回
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return ciphertext;
  }
}

/**
 * 脱敏：保留前 4 位，其余用 • 替代
 */
export function maskSecret(value: string): string {
  if (!value) return '';
  if (value === SECRET_MASK) return SECRET_MASK;
  if (value.length <= 4) return SECRET_MASK;
  return value.slice(0, 4) + '•'.repeat(Math.min(value.length - 4, 8));
}

export { SECRET_MASK };
