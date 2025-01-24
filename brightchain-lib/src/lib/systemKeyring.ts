import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { IKeyringEntry } from './interfaces/keyringEntry';

const scryptAsync = promisify(scrypt);

export class SystemKeyring {
  private static instance: SystemKeyring;
  private readonly storagePath: string;
  private readonly keys: Map<string, IKeyringEntry>;
  private readonly accessLog: Map<string, number>;
  private readonly maxAccessRate = 10; // per minute

  private constructor() {
    this.storagePath =
      process.env['KEYRING_PATH'] || join(process.cwd(), '.keyring');
    this.keys = new Map();
    this.accessLog = new Map();
  }

  public static getInstance(): SystemKeyring {
    if (!SystemKeyring.instance) {
      SystemKeyring.instance = new SystemKeyring();
    }
    return SystemKeyring.instance;
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return scryptAsync(password, salt, 32) as Promise<Buffer>;
  }

  public async storeKey(
    id: string,
    data: Buffer,
    password: string,
  ): Promise<void> {
    const salt = randomBytes(32);
    const iv = randomBytes(16);
    const key = await this.deriveKey(password, salt);

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encryptedData = Buffer.concat([
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const entry: IKeyringEntry = {
      id,
      version: 1,
      encryptedData,
      iv,
      salt,
      created: new Date(),
    };

    this.keys.set(id, entry);
    await this.persistToDisk();
  }

  public async retrieveKey(id: string, password: string): Promise<Buffer> {
    this.checkRateLimit(id);

    const entry = this.keys.get(id);
    if (!entry) {
      throw new Error(`Key ${id} not found`);
    }

    const key = await this.deriveKey(password, entry.salt);
    const decipher = createDecipheriv('aes-256-gcm', key, entry.iv);

    const authTagPos = entry.encryptedData.length - 16;
    const authTag = entry.encryptedData.slice(authTagPos);
    const encryptedData = entry.encryptedData.slice(0, authTagPos);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    entry.lastAccessed = new Date();
    this.logAccess(id);

    return decrypted;
  }

  private checkRateLimit(id: string): void {
    const accessCount = this.accessLog.get(id) || 0;
    if (accessCount >= this.maxAccessRate) {
      throw new Error('Rate limit exceeded');
    }
  }

  private logAccess(id: string): void {
    const count = (this.accessLog.get(id) || 0) + 1;
    this.accessLog.set(id, count);

    // Reset count after 1 minute
    setTimeout(() => {
      this.accessLog.set(id, 0);
    }, 60000);
  }

  private async persistToDisk(): Promise<void> {
    const data = JSON.stringify(Array.from(this.keys.entries()));
    await fs.writeFile(this.storagePath, data, { mode: 0o600 });
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      const entries = JSON.parse(data);
      this.keys.clear();
      for (const [id, entry] of entries) {
        this.keys.set(id, {
          ...entry,
          created: new Date(entry.created),
          lastAccessed: entry.lastAccessed
            ? new Date(entry.lastAccessed)
            : undefined,
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  public async initialize(): Promise<void> {
    await this.loadFromDisk();
  }

  public async rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const data = await this.retrieveKey(id, oldPassword);
    await this.storeKey(id, data, newPassword);
  }
}
