import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderId } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_DIR = path.resolve(__dirname, '../../.nexora-data/credentials');

export interface StoredProviderCredential {
  userId: string;
  provider: ProviderId;
  encryptedApiKey: string; // Base64 ciphertext
  iv: string; // Base64 12-byte IV for AES-GCM
  authTag: string; // Base64 16-byte GCM auth tag
  maskedKey: string; // e.g. "••••••••••••ABCD"
  createdAt: number;
  updatedAt: number;
  connectionStatus: 'connected' | 'disconnected' | 'invalid';
  lastValidatedAt: number;
  modelsAvailable?: string[];
}

export interface SanitizedProviderCredential {
  userId: string;
  provider: ProviderId;
  maskedKey: string;
  connectionStatus: 'connected' | 'disconnected' | 'invalid';
  createdAt: number;
  updatedAt: number;
  lastValidatedAt: number;
}

export class CredentialVault {
  private static masterKey: Buffer | null = null;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;

  /**
   * Initializes the vault directory and loads or creates the 256-bit AES master encryption key.
   */
  private static getMasterKey(): Buffer {
    if (this.masterKey) return this.masterKey;

    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }

    const keyFilePath = path.join(CREDENTIALS_DIR, '.master.key');

    // If explicit encryption secret is provided in environment, derive 32-byte key from it
    if (process.env.CREDENTIAL_ENCRYPTION_SECRET) {
      this.masterKey = crypto.createHash('sha256').update(process.env.CREDENTIAL_ENCRYPTION_SECRET).digest();
      return this.masterKey;
    }

    // Otherwise, generate/load persistent server-side master key on disk
    if (fs.existsSync(keyFilePath)) {
      try {
        const hex = fs.readFileSync(keyFilePath, 'utf-8').trim();
        if (hex && hex.length === 64) {
          this.masterKey = Buffer.from(hex, 'hex');
          return this.masterKey;
        }
      } catch (err) {
        console.warn('[CredentialVault] Failed reading master key, creating new one.', err);
      }
    }

    // Generate new random 256-bit key
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyFilePath, newKey.toString('hex'), { mode: 0o600 });
    } catch (err) {
      console.warn('[CredentialVault] Could not write master key file with 0600 permissions:', err);
    }

    this.masterKey = newKey;
    return this.masterKey;
  }

  private static getCredentialFilePath(userId: string, provider: ProviderId): string {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_\-\.@]/g, '_');
    return path.join(CREDENTIALS_DIR, `cred_${safeUserId}_${provider}.json`);
  }

  /**
   * Masks an API key for safe UI display (e.g., "••••••••••••ABCD").
   * Always protects all but the last 4 characters.
   */
  public static maskApiKey(apiKey: string): string {
    const clean = apiKey.trim();
    if (!clean) return '';
    const last4 = clean.length > 4 ? clean.slice(-4) : clean;
    return `••••••••••••${last4}`;
  }

  /**
   * Encrypts and securely stores a provider API key for a specific user.
   */
  public static saveCredential(
    userId: string,
    provider: ProviderId,
    apiKey: string,
    modelsAvailable?: string[]
  ): SanitizedProviderCredential {
    if (!userId || !userId.trim()) {
      throw new Error('User ID is required to securely store provider credentials.');
    }
    if (!apiKey || !apiKey.trim()) {
      throw new Error('API key cannot be empty.');
    }

    const masterKey = this.getMasterKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, masterKey, iv);

    const cleanKey = apiKey.trim();
    let encrypted = cipher.update(cleanKey, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    const now = Date.now();
    const maskedKey = this.maskApiKey(cleanKey);

    const record: StoredProviderCredential = {
      userId,
      provider,
      encryptedApiKey: encrypted,
      iv: iv.toString('base64'),
      authTag,
      maskedKey,
      createdAt: now,
      updatedAt: now,
      connectionStatus: 'connected',
      lastValidatedAt: now,
      modelsAvailable,
    };

    const filePath = this.getCredentialFilePath(userId, provider);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), { mode: 0o600 });

    return {
      userId: record.userId,
      provider: record.provider,
      maskedKey: record.maskedKey,
      connectionStatus: record.connectionStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastValidatedAt: record.lastValidatedAt,
    };
  }

  /**
   * Decrypts an API key in server memory only when required for an API call.
   * NEVER returns to client or exposes in logs.
   */
  public static getDecryptedKey(userId: string, provider: ProviderId): string | null {
    if (!userId) return null;

    const filePath = this.getCredentialFilePath(userId, provider);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const record: StoredProviderCredential = JSON.parse(raw);

      if (record.connectionStatus === 'disconnected') {
        return null;
      }

      const masterKey = this.getMasterKey();
      const iv = Buffer.from(record.iv, 'base64');
      const authTag = Buffer.from(record.authTag, 'base64');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, masterKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(record.encryptedApiKey, 'base64', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (err) {
      console.warn(`[CredentialVault] Decryption failed for user ${userId} / provider ${provider}`);
      return null;
    }
  }

  /**
   * Retrieves sanitized credential metadata (never plaintext or ciphertext).
   */
  public static getCredentialMetadata(
    userId: string,
    provider: ProviderId
  ): SanitizedProviderCredential | null {
    if (!userId) return null;

    const filePath = this.getCredentialFilePath(userId, provider);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const record: StoredProviderCredential = JSON.parse(raw);

      return {
        userId: record.userId,
        provider: record.provider,
        maskedKey: record.maskedKey,
        connectionStatus: record.connectionStatus,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        lastValidatedAt: record.lastValidatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Updates credential connection status (e.g., if revoked upstream).
   */
  public static updateConnectionStatus(
    userId: string,
    provider: ProviderId,
    status: 'connected' | 'disconnected' | 'invalid'
  ): void {
    const filePath = this.getCredentialFilePath(userId, provider);
    if (!fs.existsSync(filePath)) return;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const record: StoredProviderCredential = JSON.parse(raw);
      record.connectionStatus = status;
      record.updatedAt = Date.now();
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), { mode: 0o600 });
    } catch (err) {
      console.warn('[CredentialVault] Failed updating connection status:', err);
    }
  }

  /**
   * Securely deletes the encrypted credential record for a user.
   */
  public static deleteCredential(userId: string, provider: ProviderId): boolean {
    if (!userId) return false;

    const filePath = this.getCredentialFilePath(userId, provider);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (err) {
        console.warn('[CredentialVault] Failed deleting credential file:', err);
        return false;
      }
    }
    return false;
  }
}
