// Side-effect import: register Node.js disk store factory with BlockStoreFactory
// so consumers that import App (etc.) automatically get a disk-backed store
// when BRIGHTCHAIN_BLOCKSTORE_TYPE is 'disk'.
import './lib/factories/blockStoreFactory';

// Export Node.js specific components
export * from './lib/stores/index.js';
export * from './lib/transforms/index.js';

// Export Node.js specific services
export * from './lib/services/index.js';

// Database initialization
export * from './lib/databaseInit';

// API lib exports
export * from './lib/appConstants';
export * from './lib/application';
export * from './lib/constants';
export * from './lib/controllers/index.js';
// Note: UserController is exported from controllers/api, not controllers/user (which is the legacy location)
export * from './lib/enumerations/index.js';
export * from './lib/environment';
export * from './lib/errors/index.js';
export * from './lib/interfaces/index.js';
// Duplicate with brightchain-lib: export * from './lib/interfaces/symmetric-encryption-results';
// Duplicate with brightchain-lib: export * from './lib/interfaces/token-user';
// Duplicate with brightchain-lib: export * from './lib/interfaces/wallet-seed';

export * from './lib/datastore/index.js';
export * from './lib/middleware/index.js';
export * from './lib/middlewares/index.js';
export * from './lib/routers/index.js';
// Note: FEC types (ParityData, FecRecoveryResult, IFecService) are re-exported from brightchain-lib
// Only export the WASM implementation class with a unique name to avoid conflicts
export * from './lib/availability/index.js';
export * from './lib/blockFetch/index.js';
export * from './lib/utils/errorResponse';

// Validation utilities
export * from './lib/validation/userValidation';
// Explicitly export types from shared-types
export type {
  ClientSession,
  DefaultBackendIdType,
  SchemaMap,
} from './lib/shared-types';

// Auth exports
export * from './lib/auth/index.js';

// Encryption exports
export * from './lib/encryption/index.js';

// Keyring exports
export * from './lib/browserKeyring';
export * from './lib/nodeKeyring';
export * from './lib/secureEnclaveKeyring';
export * from './lib/systemKeyring';

// Plugin architecture
export * from './lib/plugins/brightchain-database-plugin';
export * from './lib/plugins/configure-brightchain-app';

// Seed data
export * from './lib/seed/orgRoleSeedData';
export * from './lib/seed/orgRoleSeedRunner';

// PoUW (Proof of Useful Work) rate limiting components
export * from './lib/pouw/index.js';
