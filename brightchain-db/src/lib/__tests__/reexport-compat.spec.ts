/**
 * @fileoverview Re-export compatibility test for @brightchain/db.
 *
 * Verifies that all symbols previously exported from @brightchain/db are still
 * available after the core engine was migrated to @brightchain/brightchain-lib.
 * Runtime symbols (classes, functions) are checked via typeof; type-only exports
 * are verified at compile time through type annotations.
 *
 * _Requirements: 8.4_
 */

import type {
  AggregationStage,
  BsonDocument,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeEvent,
  ChangeEventType,
  ChangeListener,
  ClientSession,
  CollectionOptions,
  CursorSession,
  DeleteResult,
  DocumentId,
  FilterOperator,
  FilterQuery,
  FindOptions,
  IndexOptions,
  IndexSpec,
  InsertManyResult,
  InsertOneResult,
  LogicalOperators,
  ProjectionSpec,
  ReadPreference,
  ReplaceResult,
  SortSpec,
  TextIndexOptions,
  UpdateOperators,
  UpdateOptions,
  UpdateQuery,
  UpdateResult,
  WriteConcern,
  WriteOptions,
} from '../../index';

import * as dbExports from '../../index';

// ---------------------------------------------------------------------------
// Type-only compile-time checks
// ---------------------------------------------------------------------------
// These variables are never used at runtime; they exist solely to verify that
// the type-only exports compile when imported from the package index.

type _AssertAggregationStage = AggregationStage;
type _AssertBsonDocument = BsonDocument;
type _AssertBulkWriteOperation = BulkWriteOperation;
type _AssertBulkWriteOptions = BulkWriteOptions;
type _AssertBulkWriteResult = BulkWriteResult;
type _AssertChangeEvent = ChangeEvent;
type _AssertChangeEventType = ChangeEventType;
type _AssertChangeListener = ChangeListener;
type _AssertClientSession = ClientSession;
type _AssertCollectionOptions = CollectionOptions;
type _AssertCursorSession = CursorSession;
type _AssertDeleteResult = DeleteResult;
type _AssertDocumentId = DocumentId;
type _AssertFilterOperator = FilterOperator<string>;
type _AssertFilterQuery = FilterQuery<BsonDocument>;
type _AssertFindOptions = FindOptions;
type _AssertIndexOptions = IndexOptions;
type _AssertIndexSpec = IndexSpec;
type _AssertInsertManyResult = InsertManyResult;
type _AssertInsertOneResult = InsertOneResult;
type _AssertLogicalOperators = LogicalOperators<BsonDocument>;
type _AssertProjectionSpec = ProjectionSpec;
type _AssertReadPreference = ReadPreference;
type _AssertReplaceResult = ReplaceResult;
type _AssertSortSpec = SortSpec;
type _AssertTextIndexOptions = TextIndexOptions;
type _AssertUpdateOperators = UpdateOperators<BsonDocument>;
type _AssertUpdateOptions = UpdateOptions;
type _AssertUpdateQuery = UpdateQuery<BsonDocument>;
type _AssertUpdateResult = UpdateResult;
type _AssertWriteConcern = WriteConcern;
type _AssertWriteOptions = WriteOptions;

// ---------------------------------------------------------------------------
// Runtime symbol checks – Core Engine (re-exported from brightchain-lib)
// ---------------------------------------------------------------------------

describe('Re-export compatibility: core engine classes', () => {
  const coreClasses = [
    'Collection',
    'BrightChainDb',
    'InMemoryHeadRegistry',
    'InMemoryDatabase',
    'Cursor',
    'CollectionIndex',
    'DuplicateKeyError',
    'IndexManager',
    'DbSession',
  ] as const;

  it.each(coreClasses)('%s is exported as a function (class)', (name) => {
    expect(typeof (dbExports as Record<string, unknown>)[name]).toBe(
      'function',
    );
  });
});

describe('Re-export compatibility: core engine functions', () => {
  const coreFunctions = [
    // queryEngine
    'applyProjection',
    'compareValues',
    'deepEquals',
    'getTextSearchFields',
    'matchesFilter',
    'setTextSearchFields',
    'sortDocuments',
    'tokenize',
    // updateEngine
    'applyUpdate',
    'isOperatorUpdate',
    // aggregation
    'runAggregation',
    // schemaValidation
    'applyDefaults',
    'validateDocument',
    // collection
    'calculateBlockId',
    // uuidGenerator
    'createDefaultUuidGenerator',
    // expressMiddleware
    'createDbRouter',
  ] as const;

  it.each(coreFunctions)('%s is exported as a function', (name) => {
    expect(typeof (dbExports as Record<string, unknown>)[name]).toBe(
      'function',
    );
  });
});

describe('Re-export compatibility: error classes', () => {
  const errorClasses = [
    'BrightChainDbError',
    'BulkWriteError',
    'DocumentNotFoundError',
    'IndexError',
    'TransactionError',
    'ValidationError',
    'WriteConcernError',
  ] as const;

  it.each(errorClasses)('%s is exported as a function (class)', (name) => {
    expect(typeof (dbExports as Record<string, unknown>)[name]).toBe(
      'function',
    );
  });
});

// ---------------------------------------------------------------------------
// Runtime symbol checks – Persistence-specific (remain in brightchain-db)
// ---------------------------------------------------------------------------

describe('Re-export compatibility: persistence-specific modules', () => {
  const persistenceClasses = [
    'PersistentHeadRegistry',
    'PooledStoreAdapter',
    'CBLIndex',
  ] as const;

  it.each(persistenceClasses)(
    '%s is exported as a function (class)',
    (name) => {
      expect(typeof (dbExports as Record<string, unknown>)[name]).toBe(
        'function',
      );
    },
  );
});

// ---------------------------------------------------------------------------
// New symbols introduced during migration (also must be present)
// ---------------------------------------------------------------------------

describe('Re-export compatibility: new symbols from migration', () => {
  it('InMemoryDatabase is exported as a function (class)', () => {
    expect(typeof dbExports.InMemoryDatabase).toBe('function');
  });

  it('createDefaultUuidGenerator is exported as a function', () => {
    expect(typeof dbExports.createDefaultUuidGenerator).toBe('function');
  });

  it('calculateBlockId is exported as a function', () => {
    expect(typeof dbExports.calculateBlockId).toBe('function');
  });

  it('PooledStoreAdapter is exported as a function (class)', () => {
    expect(typeof dbExports.PooledStoreAdapter).toBe('function');
  });
});
