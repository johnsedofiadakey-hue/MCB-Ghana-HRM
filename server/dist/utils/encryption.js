"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeEncrypt = exports.decryptValue = exports.encryptValue = void 0;
const crypto_1 = __importDefault(require("crypto"));
const KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'nexus-hr-platform-default-key';
const KEY = crypto_1.default.createHash('sha256').update(KEY_SOURCE).digest(); // 32 bytes
const encryptValue = (plain) => {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};
exports.encryptValue = encryptValue;
const decryptValue = (encrypted) => {
    try {
        const [ivBase64, tagBase64, contentBase64] = encrypted.split('.');
        if (!ivBase64 || !tagBase64 || !contentBase64)
            return null;
        const iv = Buffer.from(ivBase64, 'base64');
        const tag = Buffer.from(tagBase64, 'base64');
        const content = Buffer.from(contentBase64, 'base64');
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', KEY, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (e) {
        console.error('[Decryption Error]:', e);
        return null;
    }
};
exports.decryptValue = decryptValue;
const maybeEncrypt = (value) => {
    if (value === undefined || value === null)
        return null;
    const str = String(value).trim();
    if (!str)
        return null;
    // 🛡️ PREVENT DOUBLE ENCRYPTION: If it looks like an encrypted block (IV.TAG.CONTENT), skip.
    if (str.split('.').length === 3 && str.length > 40) {
        return str;
    }
    return (0, exports.encryptValue)(str);
};
exports.maybeEncrypt = maybeEncrypt;
