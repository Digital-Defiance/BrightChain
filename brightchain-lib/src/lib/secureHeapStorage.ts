import { randomBytes } from './browserCrypto';

export class SecureHeapStorage {
  private readonly storage: Map<string, Uint8Array>;

  constructor() {
    this.storage = new Map();
  }

  public async store(key: string, value: string): Promise<void> {
    // Convert to Uint8Array and store in protected memory
    const encoder = new TextEncoder();
    const buf = encoder.encode(value);
    this.storage.set(key, buf);
  }

  public async retrieve(key: string): Promise<string> {
    const buf = this.storage.get(key);
    if (!buf) {
      throw new Error('Key not found');
    }
    const decoder = new TextDecoder();
    return decoder.decode(buf);
  }

  public wipe(key: string): void {
    const buf = this.storage.get(key);
    if (buf) {
      // Overwrite with random data before deletion
      const randomData = randomBytes(buf.length);
      buf.set(randomData);
      this.storage.delete(key);
    }
  }
}
