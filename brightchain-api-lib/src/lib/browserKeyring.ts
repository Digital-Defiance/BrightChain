/**
 * Browser Keyring - Secure key storage using Web Crypto API and localStorage
 *
 * Keys are encrypted with AES-256-GCM using a PBKDF2-derived key
 * and stored in localStorage.
 */

import type { IKeyring } from './keyring.types';

/**
 * Keyring entry stored in localStorage
 */
interface IKeyringEntry {
  id: string;
  version: number;
  encryptedData: number[];
  iv: number[];
  salt: number[];
  created: string;
  lastAccessed?: string;
}

/**
 * Generate random bytes using Web Crypto API
 */
function randomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

/**
 * BrowserKeyring: Secure key storage for browser environments
 */
export class BrowserKeyring implements IKeyring {
  private static instance: BrowserKeyring;
  private readonly keys: Map<
    string,
    {
      id: string;
      version: number;
      encryptedData: Uint8Array;
      iv: Uint8Array;
      salt: Uint8Array;
      created: Date;
      lastAccessed?: Date;
    }
  >;
  private readonly accessLog: Map<string, number>;
  private readonly maxAccessRate = 10; // per minute
  private readonly storageKey = 'brightchain-api-keyring';

  private constructor() {
    this.keys = new Map();
    this.accessLog = new Map();
  }

  public static getInstance(): BrowserKeyring {
    if (!BrowserKeyring.instance) {
      BrowserKeyring.instance = new BrowserKeyring();
    }
    return BrowserKeyring.instance;
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    const saltBuffer = new Uint8Array(salt);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  public async storeKey(
    id: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    const salt = randomBytes(32);
    const iv = randomBytes(12);
    const key = await this.deriveKey(password, salt);

    const ivBuffer = new Uint8Array(iv);
    const dataBuffer = new Uint8Array(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      dataBuffer,
    );

    this.keys.set(id, {
      id,
      version: 1,
      encryptedData: new Uint8Array(encryptedData),
      iv,
      salt,
      created: new Date(),
    });

    await this.persistToStorage();
  }

  public async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    this.checkRateLimit(id);

    const entry = this.keys.get(id);
    if (!entry) {
      throw new Error(`Key not found: ${id}`);
    }

    const key = await this.deriveKey(password, entry.salt);

    try {
      const ivBuffer = new Uint8Array(entry.iv);
      const encryptedDataBuffer = new Uint8Array(entry.encryptedData);

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        key,
        encryptedDataBuffer,
      );

      entry.lastAccessed = new Date();
      this.logAccess(id);

      return new Uint8Array(decryptedData);
    } catch {
      throw new Error('Decryption failed');
    }
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

  private async persistToStorage(): Promise<void> {
    const entries: [string, IKeyringEntry][] = Array.from(
      this.keys.entries(),
    ).map(([id, entry]) => [
      id,
      {
        id: entry.id,
        version: entry.version,
        encryptedData: Array.from(entry.encryptedData),
        iv: Array.from(entry.iv),
        salt: Array.from(entry.salt),
        created: entry.created.toISOString(),
        lastAccessed: entry.lastAccessed?.toISOString(),
      },
    ]);

    localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return;

      const entries: [string, IKeyringEntry][] = JSON.parse(data);
      this.keys.clear();

      for (const [id, entry] of entries) {
        this.keys.set(id, {
          id: entry.id,
          version: entry.version,
          encryptedData: new Uint8Array(entry.encryptedData),
          iv: new Uint8Array(entry.iv),
          salt: new Uint8Array(entry.salt),
          created: new Date(entry.created),
          lastAccessed: entry.lastAccessed
            ? new Date(entry.lastAccessed)
            : undefined,
        });
      }
    } catch (error) {
      console.warn('Failed to load keyring from storage:', error);
    }
  }

  public async initialize(): Promise<void> {
    await this.loadFromStorage();
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
