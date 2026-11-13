/**
 * Browser entry point for BrightDB v2. Nothing reachable from here imports
 * Node: documents, indexes, attachments, diff, merge, subscribe and HTTP block
 * sources all work, and so do garbage collection (`collectGarbage`), forking
 * (`forkInto` or `forkBrowserDb`) and encryption at rest in IndexedDB (the
 * `encryption` option, the same format as the Node and C++ builds). Directory
 * stores, re-sealing after key rotation, packed storage and the HTTP server stay
 * in the Node entry point.
 *
 * Needs a global `Buffer` (the `buffer` package) in the page.
 */
export { HttpBlockSource } from './lib/v2/block-source';
export type { BrightDbV2BlockSource } from './lib/v2/block-source';
export { joinFromSource, PortableBrightDbCore as BrightDbBrowser, PortableSnapshot } from './lib/v2/portable-core';
export type {
  PortableChange,
  PortableChangeEvent,
  PortableCollection,
  PortableReadCollection,
  PortableSubscribeOptions,
  PortableWriteOperation,
} from './lib/v2/portable-core';
export type { AttachmentRef } from './lib/v2/attachments';
export type { IndexQuery, IndexScalar } from './lib/v2/index-key';
export type { PortableMergeResult } from './lib/v2/merge';
export {
  BrightDbV2CommitOutcomeUnknownError,
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
} from './lib/v2/storage';
export type { BrightDbV2DiskWriter, BrightDbV2Storage } from './lib/v2/storage';
export { MemoryV2Storage } from './lib/v2/memory-storage';
export { IndexedDbV2Storage, type IndexedDbV2Options } from './lib/v2/indexeddb-storage';
export { BrightDbV2WebCipher } from './lib/v2/web-cipher';
export type { BrightDbV2KeyRing } from './lib/v2/encryption';
export type { BrightDbV2GarbageStorage } from './lib/v2/storage';

import { IndexedDbV2Storage, type IndexedDbV2Options } from './lib/v2/indexeddb-storage';
import { PortableBrightDbCore } from './lib/v2/portable-core';

/**
 * Open (creating if needed) a BrightDB v2 database stored in this browser under `name`.
 * Several tabs can open the same name; writes are serialized with Web Locks.
 */
export async function openBrowserDb(name: string, options: IndexedDbV2Options = {}): Promise<PortableBrightDbCore> {
  return PortableBrightDbCore.fromStorage(await IndexedDbV2Storage.open(name, options));
}

/**
 * Copy `db` into a new browser database named `name` as an independent replica
 * with its own writer ID. Both can then write and `merge` each other. Give
 * `options.encryption` to encrypt the copy (with a different key if you like).
 */
export async function forkBrowserDb(db: PortableBrightDbCore, name: string, options: IndexedDbV2Options = {}): Promise<PortableBrightDbCore> {
  return db.forkInto(await IndexedDbV2Storage.open(name, options));
}
