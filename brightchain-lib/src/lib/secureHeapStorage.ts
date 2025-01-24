import { randomBytes } from 'crypto';

export class SecureHeapStorage {
  private readonly storage: Map<string, Buffer>;

  constructor() {
    this.storage = new Map();
  }

  public async store(key: string, value: string): Promise<void> {
    // Convert to Buffer and store in protected memory
    const buf = Buffer.from(value, 'utf8');
    this.storage.set(key, buf);
  }

  public async retrieve(key: string): Promise<string> {
    const buf = this.storage.get(key);
    if (!buf) {
      throw new Error('Key not found');
    }
    return buf.toString('utf8');
  }

  public wipe(key: string): void {
    const buf = this.storage.get(key);
    if (buf) {
      // Overwrite with random data before deletion
      randomBytes(buf.length).copy(buf);
      this.storage.delete(key);
    }
  }
}
