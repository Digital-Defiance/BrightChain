/**
 * Platform-neutral storage contract and errors for BrightDB v2. Nothing here
 * imports Node, so browser builds can use it.
 */

export class BrightDbV2StorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class BrightDbV2MissingBlockError extends BrightDbV2StorageError {
  constructor(
    readonly digest: string,
    options?: ErrorOptions,
  ) {
    super(`BrightDB v2 block ${digest} is missing`, options);
  }
}

export class BrightDbV2CommitOutcomeUnknownError extends BrightDbV2StorageError {}

export interface BrightDbV2DiskWriter {
  writeBlock(payload: Uint8Array): Promise<string>;
  writeBlocks(payloads: Iterable<Uint8Array>): Promise<void>;
  /** Make every block written so far durable without publishing a head. */
  syncBlocks(): Promise<void>;
  publishHead(digest: string): Promise<void>;
}

/**
 * Optional contract for storages that can enumerate and delete their blocks, so
 * `collectGarbage` works on them. Blocks are listed by their stored name: the
 * digest, or a keyed name when the storage encrypts (see `nameOf`).
 */
export interface BrightDbV2GarbageStorage {
  /** Every stored block with its size and the time it was written (0 when unknown). */
  listBlocks(): Promise<Array<{ name: string; bytes: number; modifiedMs: number }>>;
  /** The stored name of a block with this logical digest. */
  nameOf(digest: string): Promise<string>;
  /** Delete blocks by stored name. Call only inside `withWriteLock`. */
  deleteBlocks(names: string[]): Promise<void>;
}

export function isGarbageStorage(storage: unknown): storage is BrightDbV2GarbageStorage {
  const s = storage as Partial<BrightDbV2GarbageStorage>;
  return typeof s?.listBlocks === 'function' && typeof s.nameOf === 'function' && typeof s.deleteBlocks === 'function';
}

/**
 * What a BrightDB v2 database needs from the storage beneath it: blocks named
 * by their plaintext digest, one published head, and exclusive writes. The disk
 * store is the first implementation. Others, such as a BrightChain pool, can
 * implement this and report whether they already encrypt.
 */
export interface BrightDbV2Storage {
  readonly writerId: Uint8Array;
  /** True when the storage encrypts blocks itself. BrightDB then refuses to add a second layer. */
  readonly encryptsAtRest: boolean;
  readHead(): Promise<string>;
  readBlock(digest: string): Promise<Uint8Array>;
  hasBlock(digest: string): Promise<boolean>;
  withWriteLock<T>(write: (writer: BrightDbV2DiskWriter) => Promise<T>): Promise<T>;
}

