/**
 * BrightChain API Constants Module
 *
 * This module extends base constants from @digitaldefiance/node-express-suite
 * using createExpressConstants() and adds API-specific constants.
 *
 * Base constants (from @digitaldefiance/node-express-suite):
 * - PBKDF2: Password-based key derivation configuration
 * - CHECKSUM: SHA3 checksum configuration
 * - FEC: Forward error correction settings
 * - KEYRING: Keyring algorithm configuration
 * - ENCRYPTION: Encryption settings
 * - Express Configuration: Express app settings, CORS, CSP, etc.
 * - JWT: Base JWT configuration
 * - Session: Session management settings
 *
 * API-specific constants:
 * - WRAPPED_KEY: Wrapped key operations
 *
 * @see {@link https://github.com/Digital-Defiance/node-express-suite} for base constants
 * @module constants
 */

import { createExpressConstants } from '@digitaldefiance/node-express-suite';
import { IApiConstants } from './interfaces/api-constants';

/**
 * API-specific constants for wrapped key operations
 * These constants define the cryptographic parameters for wrapping and unwrapping keys
 */
export const WRAPPED_KEY = {
  SALT_SIZE: 32 as const,
  IV_SIZE: 16 as const,
  MASTER_KEY_SIZE: 32 as const,
  MIN_ITERATIONS: 100000 as const,
} as const;

/**
 * API Constants extending from @digitaldefiance/node-express-suite
 *
 * Uses createExpressConstants() to generate base constants for Express applications,
 * then adds API-specific constants (WRAPPED_KEY).
 *
 * Includes all base constants:
 * - PBKDF2, CHECKSUM, FEC, KEYRING, ENCRYPTION (cryptographic)
 * - CORS, CSP, JWT, Session (Express/API)
 *
 * Plus API-specific constants:
 * - WRAPPED_KEY (key wrapping operations)
 *
 * @see {@link https://github.com/Digital-Defiance/node-express-suite} for base constants
 */
export const Constants: IApiConstants = {
  ...createExpressConstants('brightchain.io', 'brightchain.io', {
    Site: 'BrightChain',
  }),
  WRAPPED_KEY,
};
