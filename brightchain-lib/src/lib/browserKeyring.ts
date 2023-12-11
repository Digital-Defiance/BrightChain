/**
 * Browser-compatible keyring implementation using Web Crypto API and localStorage
 */

import { randomBytes } from './browserCrypto';
import { BrightChainStrings } from './enumerations/brightChainStrings';
import { SystemKeyringErrorType } from './enumerations/systemKeyringErrorType';
import { SystemKeyringError } from './errors/systemKeyringError';
import { translate } from './i18n';
import { IKeyringEntry } from './interfaces/keyringEntry';

export class BrowserKeyring {
  private static instance: BrowserKeyring;
  private readonly keys: Map<string, IKeyringEntry>;
  private readonly accessLog: Map<string, number>;
  private readonly maxAccessRate = 10; // per minute

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

    // Ensure salt has proper ArrayBuffer backing
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
    const iv = randomBytes(12); // GCM uses 12-byte IV
    const key = await this.deriveKey(password, salt);

    // Ensure iv has proper ArrayBuffer backing
    const ivBuffer = new Uint8Array(iv);
    // Ensure data has proper ArrayBuffer backing
    const dataBuffer = new Uint8Array(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      dataBuffer,
    );

    const entry: IKeyringEntry = {
      id,
      version: 1,
      encryptedData: new Uint8Array(encryptedData),
      iv,
      salt,
      created: new Date(),
    };

    this.keys.set(id, entry);
    await this.persistToStorage();
  }

  public async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    this.checkRateLimit(id);

    const entry = this.keys.get(id);
    if (!entry) {
      throw new SystemKeyringError(SystemKeyringErrorType.KeyNotFound, id);
    }

    const key = await this.deriveKey(password, entry.salt);

    try {
      // Ensure iv has proper ArrayBuffer backing
      const ivBuffer = new Uint8Array(entry.iv);
      // Ensure encryptedData has proper ArrayBuffer backing
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
      throw new SystemKeyringError(SystemKeyringErrorType.DecryptionFailed);
    }
  }

  private checkRateLimit(id: string): void {
    const accessCount = this.accessLog.get(id) || 0;
    if (accessCount >= this.maxAccessRate) {
      throw new SystemKeyringError(SystemKeyringErrorType.RateLimitExceeded);
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
    const entries = Array.from(this.keys.entries()).map(([id, entry]) => [
      id,
      {
        ...entry,
        encryptedData: Array.from(entry.encryptedData),
        iv: Array.from(entry.iv),
        salt: Array.from(entry.salt),
      },
    ]);

    localStorage.setItem('brightchain-keyring', JSON.stringify(entries));
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = localStorage.getItem('brightchain-keyring');
      if (!data) return;

      const entries = JSON.parse(data);
      this.keys.clear();

      for (const [id, entry] of entries) {
        this.keys.set(id, {
          ...entry,
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
      console.warn(
        translate(BrightChainStrings.Warning_Keyring_FailedToLoad),
        error,
      );
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
