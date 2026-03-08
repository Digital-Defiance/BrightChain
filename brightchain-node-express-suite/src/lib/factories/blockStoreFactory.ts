/**
 * Re-export BlockStoreFactory from brightchain-lib.
 *
 * The new library does NOT register any disk store factory — that's the
 * responsibility of api-lib (which imports DiskBlockAsyncStore, a Node.js-
 * specific implementation). This module simply provides a convenient
 * import path for consumers.
 */
export { BlockStoreFactory } from '@brightchain/brightchain-lib';
