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

