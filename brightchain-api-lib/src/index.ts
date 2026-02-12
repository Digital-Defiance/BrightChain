// Export Node.js specific components
export * from './lib/stores';
export * from './lib/transforms';

// Export Node.js specific services
export * from './lib/services';

// API lib exports
export * from './lib/appConstants';
export * from './lib/application';
export * from './lib/application-base';
export * from './lib/constants';
export * from './lib/controllers';
// Note: UserController is exported from controllers/api, not controllers/user (which is the legacy location)
export * from './lib/enumerations';
export * from './lib/environment';
export * from './lib/errors';
export * from './lib/interfaces';
// Duplicate with brightchain-lib: export * from './lib/interfaces/symmetric-encryption-results';
// Duplicate with brightchain-lib: export * from './lib/interfaces/token-user';
// Duplicate with brightchain-lib: export * from './lib/interfaces/wallet-seed';

export * from './lib/datastore';
export * from './lib/middlewares';
export * from './lib/routers';
// Note: FEC types (ParityData, FecRecoveryResult, IFecService) are re-exported from brightchain-lib
// Only export the WASM implementation class with a unique name to avoid conflicts
export * from './lib/availability';
export * from './lib/blockFetch';
export * from './lib/utils/errorResponse';
export * from './lib/utils/type-converters';
// Explicitly export types from shared-types
export type {
  ClientSession,
  DefaultBackendIdType,
  SchemaMap,
} from './lib/shared-types';

// Keyring exports
export * from './lib/browserKeyring';
export * from './lib/nodeKeyring';
export * from './lib/secureEnclaveKeyring';
export * from './lib/systemKeyring';
