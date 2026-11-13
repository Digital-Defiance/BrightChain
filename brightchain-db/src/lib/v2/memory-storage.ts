/**
 * An in-memory BrightDB v2 storage, for tests, previews and databases that do
 * not need to survive a reload. Platform neutral.
 */
import { digestPayload, encodeMetadata } from './codec';
import {
  BrightDbV2MissingBlockError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
} from './storage';

export class MemoryV2Storage implements BrightDbV2Storage {
  readonly blocks = new Map<string, Uint8Array>();
  private head = '';
  private chain: Promise<unknown> = Promise.resolve();

  private constructor(
    readonly writerId: Uint8Array,
    /** Report that the storage encrypts, as an adapter over an encrypting pool would. */
    readonly encryptsAtRest = false,
  ) {}

  /** A new empty database with the given 32-hex-digit ID, or a random one. */
  static create(databaseId?: string, writerId?: Uint8Array, encryptsAtRest = false): MemoryV2Storage {
    const id = databaseId ?? Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(16))).toString('hex');
    const storage = new MemoryV2Storage(writerId ?? globalThis.crypto.getRandomValues(new Uint8Array(16)), encryptsAtRest);
    const root = encodeMetadata({ kind: 'database', databaseId: id, clock: 0n, catalog: null });
    storage.head = digestPayload(root);
    storage.blocks.set(storage.head, root);
    return storage;
  }

  /** An independent copy with its own writer ID, as a replica would be. */
  copy(writerId?: Uint8Array): MemoryV2Storage {
    const copy = new MemoryV2Storage(writerId ?? globalThis.crypto.getRandomValues(new Uint8Array(16)), this.encryptsAtRest);
    for (const [digest, bytes] of this.blocks) copy.blocks.set(digest, bytes);
    copy.head = this.head;
    return copy;
  }

  async readHead(): Promise<string> {
    return this.head;
  }

  async readBlock(digest: string): Promise<Uint8Array> {
    const bytes = this.blocks.get(digest);
    if (!bytes) throw new BrightDbV2MissingBlockError(digest);
    return bytes;
  }

  async hasBlock(digest: string): Promise<boolean> {
    return this.blocks.has(digest);
  }

  withWriteLock<T>(write: (writer: BrightDbV2DiskWriter) => Promise<T>): Promise<T> {
    const run = this.chain.then(() =>
      write({
        writeBlock: async (payload) => {
          const digest = digestPayload(payload);
          this.blocks.set(digest, Uint8Array.from(payload));
          return digest;
        },
        writeBlocks: async (payloads) => {
          for (const payload of payloads) this.blocks.set(digestPayload(payload), Uint8Array.from(payload));
        },
        syncBlocks: async () => undefined,
        publishHead: async (digest) => {
          if (!this.blocks.has(digest)) throw new BrightDbV2MissingBlockError(digest);
          this.head = digest;
        },
      }),
    );
    this.chain = run.catch(() => undefined);
    return run;
  }
}
