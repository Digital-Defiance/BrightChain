/**
 * Browser-safe exports from brightchain-api-lib
 *
 * This file exports only the types and constants that are safe to use
 * in browser environments, excluding Node.js-specific implementations.
 */

// Export only constants and types, no Node.js implementations
export * from './lib/constants';
export * from './lib/enumerations';
export * from './lib/errors';

// Export only interfaces/types, not implementations
export type { IApiConstants } from './lib/interfaces/api-constants';
export type {
  ClientSession,
  DefaultBackendIdType,
  SchemaMap,
} from './lib/shared-types';

// Export browser-safe keyring
export * from './lib/browserKeyring';
