import crypto from 'crypto';

const KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
if (!KEY_SOURCE) {
  throw new Error('[Encryption] CRITICAL: DATA_ENCRYPTION_KEY or JWT_SECRET must be set for encryption services.');
}
const KEY = crypto.createHash('sha256').update(KEY_SOURCE).digest(); // 32 bytes

export const encryptValue = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

export const decryptValue = (encrypted: string): string | null => {
  try {
    const [ivBase64, tagBase64, contentBase64] = encrypted.split('.');
    if (!ivBase64 || !tagBase64 || !contentBase64) return null;

    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    const content = Buffer.from(contentBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('[Decryption Error]:', e);
    return null;
  }
};

export const maybeEncrypt = (value?: string | number | null): string | null => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  if (!str) return null;
  
  // 🛡️ PREVENT DOUBLE ENCRYPTION: If it looks like an encrypted block (IV.TAG.CONTENT), skip.
  if (str.split('.').length === 3 && str.length > 40) {
    return str;
  }
  
  return encryptValue(str);
};
