/**
 * @brightchain/node-express-suite
 *
 * Generic BrightDB-backed Express infrastructure extracted from brightchain-api-lib.
 * This library sits between @digitaldefiance/node-express-suite (upstream) and
 * @brightchain/brightchain-api-lib (domain-specific).
 */

// Shared types
export type {
  ClientSession,
  DefaultBackendIdType,
  GuidV4Buffer,
  IBlockStorageModel,
  IBlockStorageSchema,
  IBlockStorageSchemaEntry,
  SchemaMap,
  SignatureBuffer,
} from './lib/shared-types';

// Backend ID type
export type { DefaultBackendIdType as DefaultBackendIdType_ } from './lib/types/backend-id';

// Datastore
export {
  BlockDocumentStore,
  CollectionHeadRegistry,
} from './lib/datastore/block-document-store';
export type {
  CreateDocumentOptions,
  RetrieveDocumentOptions,
} from './lib/datastore/block-document-store';
export * from './lib/datastore/block-document-store-factory';
export { BrightDbDocumentStoreAdapter } from './lib/datastore/bright-db-document-store-adapter';
export * from './lib/datastore/document-store';
export { MemoryDocumentStore } from './lib/datastore/memory-document-store';

// Validation
export {
  validateLogin,
  validatePasswordChange,
  validateRecovery,
  validateRegistration,
} from './lib/validation/userValidation';
export type {
  IValidationError,
  IValidationResult,
} from './lib/validation/userValidation';

// Middleware
export { validateBody } from './lib/middleware/validateBody';

// Session Adapter
export { BrightChainSessionAdapter } from './lib/services/sessionAdapter';
export type { ISessionDocument } from './lib/services/sessionAdapter';

// Database Initialization
export { brightchainDatabaseInit } from './lib/databaseInit';
export type {
  IDatabaseInitEnvironment,
  IGenericInitData,
} from './lib/databaseInit';

// Factories
export { BlockStoreFactory } from './lib/factories/blockStoreFactory';

// Environment
export { BrightDbEnvironment } from './lib/environment';
export type {
  IAzureEnvironmentConfig,
  IS3EnvironmentConfig,
} from './lib/interfaces/environment';

// Plugins
export { BrightDbDatabasePlugin } from './lib/plugins/bright-db-database-plugin';
export type { IBrightDbDatabasePluginOptions } from './lib/plugins/bright-db-database-plugin';

// Dev Store Seeder
export {
  printDevStoreResults,
  seedDevStore,
} from './lib/services/dev-store-seeder';
export type {
  IDevMemberResult,
  IDevStoreSeederResult,
} from './lib/services/dev-store-seeder';

// Application
export { BrightDbApplication } from './lib/application';
export type { IBrightDbApplication } from './lib/interfaces/bright-db-application';

// Configure App Helper
export { configureBrightDbApp } from './lib/plugins/configure-bright-db-app';
export type { ConfigureBrightDbAppResult } from './lib/plugins/configure-bright-db-app';

// Authentication Provider
export { BrightDbAuthenticationProvider } from './lib/services/bright-db-authentication-provider';

// Constants
export { BrightDbConstants } from './lib/constants';

// Middlewares
export { BrightDbMiddlewares } from './lib/middlewares';

// Upstream re-exports
export * from './lib/upstream';

// BrightDB re-exports
export * from './lib/brightdb';

// BrightChain-lib re-exports
export * from './lib/brightchain-lib';

// Test utilities
export { createTestApp } from './lib/create-test-app';
export type { CreateTestAppResult } from './lib/create-test-app';

// MERN→BERN Parity Classes
export { BrightDbModelRegistry } from './lib/bright-db-model-registry';
export type { BrightDbModelRegistration } from './lib/bright-db-model-registry';
export { BrightDbBaseService } from './lib/services/bright-db-base-service';
export { BrightDbCollection } from './lib/services/bright-db-collection';
export { BrightDbTransactionManager } from './lib/transactions/bright-db-transaction-manager';
export type { BrightDbTransactionOptions } from './lib/transactions/bright-db-transaction-manager';

// IBrightDbDocumentStore interface
export type { IBrightDbDocumentStore } from './lib/datastore/document-store';

// Interfaces — Auth / Token / Responses
export type { IAuthCredentials } from './lib/interfaces/auth-credentials';
export type { IAuthToken } from './lib/interfaces/auth-token';
export type {
  IApiBackupCodesResponse,
  IApiCodeCountResponse,
  IApiLoginResponse,
  IApiPasswordChangeResponse,
  IApiRecoveryResponse,
  IApiRequestUserResponse,
  IAuthApiResponse,
  IUserProfileApiResponse,
} from './lib/interfaces/responses';
export type { ITokenPayload } from './lib/interfaces/token-payload';

// Enumerations
export { SchemaCollection } from './lib/enumerations/schema-collection';

// Auth Service
export { BrightDbAuthService } from './lib/services/auth';

// User Controller
export { BrightDbUserController } from './lib/controllers/user';

// API Router
export { BrightDbApiRouter } from './lib/routers/api';
