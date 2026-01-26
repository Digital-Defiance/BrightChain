/**
 * Node.js Keyring - Secure key storage for Node.js environments
 *
 * Keys are encrypted with AES-256-GCM using a password-derived key (scrypt)
 * and stored in the user's home directory.
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { IKeyring } from './keyring.types';

/**
 * NodeKeyring: Secure key storage for Node.js environments
 */
export class NodeKeyring implements IKeyring {
  private static instance: NodeKeyring;
  private keyDir: string;

  private constructor() {
    // Store keys in user home directory under .brightchain-keys
    this.keyDir = path.join(
      process.env['HOME'] || process.env['USERPROFILE'] || '.',
      '.brightchain-keys',
    );
  }

  public static getInstance(): NodeKeyring {
    if (!NodeKeyring.instance) {
      NodeKeyring.instance = new NodeKeyring();
    }
    return NodeKeyring.instance;
  }

  public async initialize(): Promise<void> {
    await fs.mkdir(this.keyDir, { recursive: true, mode: 0o700 });
  }

  public async storeKey(
    id: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = await this.deriveKey(password, salt);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([salt, iv, tag, encrypted]);
    await fs.writeFile(this.keyPath(id), payload, { mode: 0o600 });
    this.zeroBuffer(key);
  }

  public async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    const payload = await fs.readFile(this.keyPath(id));
    const salt = payload.subarray(0, 16);
    const iv = payload.subarray(16, 28);
    const tag = payload.subarray(28, 44);
    const encrypted = payload.subarray(44);
    const key = await this.deriveKey(password, salt);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    this.zeroBuffer(key);
    return decrypted;
  }

  public async rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const data = await this.retrieveKey(id, oldPassword);
    await this.storeKey(id, data, newPassword);
    this.zeroBuffer(data);
  }

  private keyPath(id: string): string {
    // Sanitize the ID to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.keyDir, `${safeId}.key`);
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        32,
        { N: 2 ** 14, r: 8, p: 1 },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey as Buffer);
        },
      );
    });
  }

  private zeroBuffer(buf: Buffer | Uint8Array): void {
    buf.fill(0);
  }
}
