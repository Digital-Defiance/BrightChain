/**
 * @brightchain/db
 *
 * A MongoDB-like document database backed by BrightChain's block store.
 *
 * Core engine modules (query engine, update engine, cursor, indexing,
 * aggregation, schema validation, errors, transactions, Collection,
 * InMemoryDatabase, etc.) are re-exported from @brightchain/brightchain-lib.
 *
 * Persistence-specific modules (PersistentHeadRegistry, PooledStoreAdapter,
 * CBLIndex, expressMiddleware, BrightChainDb) remain in this package.
 */

// ============================================================================
// Core Engine – re-exported from brightchain-lib's db barrel
// ============================================================================
// Includes: types, uuidGenerator, errors, queryEngine, updateEngine, cursor,
// indexing, aggregation, schemaValidation, InMemoryHeadRegistry, transaction,
// Collection, calculateBlockId, InMemoryDatabase, InMemoryDatabaseOptions
export * from '@brightchain/brightchain-lib/lib/db';

// ============================================================================
// Persistence-specific modules (Node.js / Express)
// ============================================================================

// BrightChainDb – extends InMemoryDatabase with disk persistence
export { BrightChainDb } from './lib/database';
export type { BrightChainDbOptions } from './lib/database';

// PersistentHeadRegistry – disk-backed head tracking
export { PersistentHeadRegistry } from './lib/headRegistry';
export type { HeadRegistryOptions } from './lib/headRegistry';

// PooledStoreAdapter – pool-scoped block store adapter
export { PooledStoreAdapter } from './lib/pooledStoreAdapter';

// CBL Index – higher-level CBL index with persistence concerns
export { CBLIndex } from './lib/cblIndex';
export type { CBLIndexOptions } from './lib/cblIndex';

// Express middleware – REST API router for BrightChainDb
export { createDbRouter } from './lib/expressMiddleware';
export type { DbRouterOptions } from './lib/expressMiddleware';
