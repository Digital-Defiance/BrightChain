// API lib exports
export * from './lib/application';
export * from './lib/application-base';
export * from './lib/appConstants';
export * from './lib/constants';
export * from './lib/controllers/base';
export * from './lib/controllers/user';
export * from './lib/documents/index';
export * from './lib/documents/used-direct-login-token';
export * from './lib/enumerations/symmetric-error-type';
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
export * from './lib/errors/missing-validated-data';
export * from './lib/errors/mnemonic-or-password-required';
export * from './lib/errors/restricted';
export * from './lib/errors/symmetric';
export * from './lib/errors/token-expired';
export * from './lib/errors/token-not-found';
export * from './lib/interfaces/api-constants';
export * from './lib/interfaces/api-express-validation-error-response';
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
export * from './lib/interfaces/checksum-config';
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
export * from './lib/interfaces/member/member-with-mnemonic';
export * from './lib/interfaces/member/operational';
export * from './lib/interfaces/multi-encrypted-message';
export * from './lib/interfaces/multi-encrypted-parsed-header';
export * from './lib/interfaces/pbkdf2-result';
export * from './lib/interfaces/request-user';
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
export * from './lib/interfaces/symmetric-encryption-results';
export * from './lib/interfaces/token-user';
export * from './lib/interfaces/wallet-seed';
export * from './lib/middlewares';
export * from './lib/enumerations/model-name';
// export * from './lib/middlewares/set-global-context-language';
export * from './lib/documents/email-token';
export * from './lib/documents/mnemonic';
export * from './lib/documents/role';
export * from './lib/documents/used-direct-login-token';
export * from './lib/documents/user';
export * from './lib/routers/api';
export * from './lib/routers/app';
export * from './lib/routers/base';
export * from './lib/schemas/email-token';
export * from './lib/schemas/mnemonic';
export * from './lib/schemas/role';
export * from './lib/schemas/schema';
export * from './lib/schemas/used-direct-login-token';
export * from './lib/schemas/user';
// export * from './lib/services/backupCode';
// export * from './lib/services/base';
export * from './lib/services/email';
export * from './lib/services/fec';
export * from './lib/services/keyWrapping';
export * from './lib/services/pbkdf2';
// export * from './lib/services/role';
// export * from './lib/services/system-user';
export * from './lib/services/user';
export * from './lib/utils/type-converters';
// Explicitly export types from shared-types
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
  MongooseDocument,
  MongooseModel,
  RouteConfig,
  SchemaMap,
  SendFunction,
  TypedHandlers,
  ValidatedBody,
} from './lib/shared-types';
export { routeConfig } from './lib/shared-types';
// Re-export interfaces from node-express-suite
export type {
  IApiErrorResponse,
  IApiMessageResponse,
  IStatusCodeResponse,
} from '@digitaldefiance/node-express-suite';
