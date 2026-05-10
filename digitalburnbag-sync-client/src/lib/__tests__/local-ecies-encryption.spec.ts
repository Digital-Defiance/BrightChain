import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalEciesEncryption } from '../adapters/local-ecies-encryption';

describe('LocalEciesEncryption', () => {
  let encryption: LocalEciesEncryption;
  let tmpDir: string;

  beforeEach(async () => {
    encryption = new LocalEciesEncryption();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burnbag-enc-'));
    const keyMaterial = crypto.randomBytes(32);
    await encryption.initialize('test-user', keyMaterial);
  });

  afterEach(() => {
    encryption.destroy();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should throw if not initialized', async () => {
    const uninit = new LocalEciesEncryption();
    await expect(uninit.encrypt(new Uint8Array(10))).rejects.toThrow(
      'not initialized',
    );
  });

  it('should encrypt and decrypt bytes round-trip', async () => {
    const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const ciphertext = await encryption.encrypt(plaintext);

    // Ciphertext should be different from plaintext
    expect(Buffer.from(ciphertext).equals(Buffer.from(plaintext))).toBe(false);
    // Ciphertext should be longer (IV + authTag + encrypted)
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);

    const decrypted = await encryption.decrypt(ciphertext);
    expect(Buffer.from(decrypted).equals(Buffer.from(plaintext))).toBe(true);
  });

  it('should encrypt and decrypt a file in-place', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    const content = 'Hello, encrypted world!';
    fs.writeFileSync(filePath, content);

    await encryption.encryptFile(filePath);

    // File content should be different after encryption
    const encrypted = fs.readFileSync(filePath);
    expect(encrypted.toString()).not.toBe(content);

    await encryption.decryptFile(filePath);

    // File content should be restored
    const decrypted = fs.readFileSync(filePath, 'utf-8');
    expect(decrypted).toBe(content);
  });

  it('should reject tampered ciphertext', async () => {
    const plaintext = new Uint8Array([10, 20, 30]);
    const ciphertext = await encryption.encrypt(plaintext);

    // Flip a byte in the encrypted portion
    ciphertext[30] ^= 0xff;

    await expect(encryption.decrypt(ciphertext)).rejects.toThrow();
  });

  it('should reject truncated ciphertext', async () => {
    const short = new Uint8Array(10);
    await expect(encryption.decrypt(short)).rejects.toThrow('too short');
  });

  it('should wipe key material on destroy', async () => {
    encryption.destroy();
    await expect(encryption.encrypt(new Uint8Array(10))).rejects.toThrow(
      'not initialized',
    );
  });

  it('should produce different ciphertext for same plaintext (random IV)', async () => {
    const plaintext = new Uint8Array([1, 2, 3]);
    const ct1 = await encryption.encrypt(plaintext);
    const ct2 = await encryption.encrypt(plaintext);
    expect(Buffer.from(ct1).equals(Buffer.from(ct2))).toBe(false);
  });
});
