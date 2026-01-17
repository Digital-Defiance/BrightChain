// Re-export everything from brightchain-lib
export * from '@brightchain/brightchain-lib';

// Export Node.js specific components
export * from './lib/stores/diskBlockAsyncStore';
export * from './lib/stores/diskBlockMetadataStore';
export * from './lib/stores/diskBlockStore';
export * from './lib/stores/availabilityAwareBlockStore';
export * from './lib/transforms/checksumTransform';
export * from './lib/transforms/memoryWritableStream';
export * from './lib/transforms/xorMultipleTransform';

// API lib exports
export * from './lib/appConstants';
export * from './lib/application';
export * from './lib/application-base';
export * from './lib/constants';
export * from './lib/controllers/base';
export * from './lib/controllers/user';
export * from './lib/environment';
export * from './lib/errors/admin-role-not-found';
export * from './lib/errors/email-already-verified';
export * from './lib/errors/email-token-failed-to-send';
export * from './lib/errors/invalid-backup-code-version';
export * from './lib/errors/invalid-challenge-response';
export * from './lib/errors/invalid-expired-token';
export * from './lib/errors/invalid-jwt-token';
export * from './lib/errors/last-admin-error';
export * from './lib/errors/login-challenge-expired';
export * from './lib/errors/member-role-not-found';
export * from './lib/errors/mnemonic-or-password-required';
export * from './lib/errors/restricted';
export * from './lib/errors/token-expired';
export * from './lib/errors/token-not-found';
export * from './lib/interfaces/api-constants';
export * from './lib/interfaces/application';
export * from './lib/interfaces/authenticated-cipher';
export * from './lib/interfaces/authenticated-decipher';
export * from './lib/interfaces/backend-objects/email-token';
export * from './lib/interfaces/backend-objects/request-user';
export * from './lib/interfaces/backend-objects/role';
export * from './lib/interfaces/backend-objects/user';
export * from './lib/interfaces/bases/mnemonic';
export * from './lib/interfaces/bases/user';
export * from './lib/interfaces/bases/user-role';
export * from './lib/interfaces/discriminator-collections';
export * from './lib/interfaces/ecies-consts';
export * from './lib/interfaces/environment';
export * from './lib/interfaces/environment-aws';
export * from './lib/interfaces/jwt-sign-response';
// Re-export interfaces from node-ecies-lib for backward compatibility
export type {
  IKeyPairBufferWithUnEncryptedPrivateKey,
  ISigningKeyPrivateKeyInfo,
  ISimpleKeyPair,
  ISimpleKeyPairBuffer,
  ISimplePublicKeyOnly,
  ISimplePublicKeyOnlyBuffer,
} from '@digitaldefiance/node-ecies-lib';
export * from './lib/enumerations/model-name';
export * from './lib/interfaces/member/member-with-mnemonic';
export * from './lib/interfaces/multi-encrypted-parsed-header';
export * from './lib/interfaces/pbkdf2-result';
// Duplicate with brightchain-lib: export * from './lib/interfaces/request-user';
export * from './lib/interfaces/responses/api-backup-codes-response';
export * from './lib/interfaces/responses/api-challenge-response';
export * from './lib/interfaces/responses/api-code-count-response';
export * from './lib/interfaces/responses/api-login-response';
export * from './lib/interfaces/responses/api-mnemonic-response';
export * from './lib/interfaces/responses/api-registration-response';
export * from './lib/interfaces/responses/api-request-user-response';
export * from './lib/interfaces/schema';
export * from './lib/interfaces/server-init-result';
export * from './lib/interfaces/single-encrypted-parsed-header';
export * from './lib/interfaces/status-code-response';
// Duplicate with brightchain-lib: export * from './lib/interfaces/symmetric-encryption-results';
// Duplicate with brightchain-lib: export * from './lib/interfaces/token-user';
// Duplicate with brightchain-lib: export * from './lib/interfaces/wallet-seed';
export * from './lib/middlewares';
export * from './lib/routers/api';
export * from './lib/routers/app';
export * from './lib/routers/base';
export * from './lib/datastore/document-store';
export * from './lib/datastore/memory-document-store';
export * from './lib/datastore/document-model-adapter';
export * from './lib/datastore/block-document-store';
export type { CreateDocumentOptions, RetrieveDocumentOptions } from './lib/datastore/block-document-store';
export { CollectionHeadRegistry } from './lib/datastore/block-document-store';
export * from './lib/datastore/block-document-store-factory';
export * from './lib/services/email';
// Note: FEC types (ParityData, FecRecoveryResult, IFecService) are re-exported from brightchain-lib
// Only export the WASM implementation class with a unique name to avoid conflicts
export { WasmFecService } from './lib/services/fec';
export * from './lib/services/fecServiceFactory';
export * from './lib/services/nativeRsFecService';
export * from './lib/services/keyWrapping';
export * from './lib/services/pbkdf2';
export * from './lib/services/user';
export * from './lib/services/diskQuorumService';
export * from './lib/utils/type-converters';
export * from './lib/availability';
// Explicitly export types from shared-types
export { routeConfig } from './lib/shared-types';
export type {
  ApiErrorResponse,
  ApiRequestHandler,
  ApiResponse,
  ClientSession,
  DefaultBackendIdType,
  FlexibleValidationChain,
  HttpMethod,
  JsonPrimitive,
  JsonResponse,
  RouteConfig,
  SchemaMap,
  SendFunction,
  TypedHandlers,
  ValidatedBody,
} from './lib/shared-types';
// Re-export interfaces from node-express-suite
export type {
  IApiErrorResponse,
  IApiMessageResponse,
  IStatusCodeResponse,
} from '@digitaldefiance/node-express-suite';
