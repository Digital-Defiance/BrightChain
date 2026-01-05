/**
 * BrightChain API Constants Interfaces
 *
 * This module defines interfaces for API-specific constants.
 * The main IApiConstants interface extends IConstants from @digitaldefiance/node-express-suite
 * and adds API-specific constants.
 *
 * @see {@link https://github.com/Digital-Defiance/node-express-suite} for base interface
 * @module api-constants
 */

import { IConstants } from '@digitaldefiance/node-express-suite';

/**
 * Wrapped key constants interface
 *
 * Defines cryptographic parameters for key wrapping operations,
 * including salt size, IV size, master key size, and minimum iterations.
 */
export interface IWrappedKeyConsts {
  readonly SALT_SIZE: number;
  readonly IV_SIZE: number;
  readonly MASTER_KEY_SIZE: number;
  readonly MIN_ITERATIONS: number;
}

/**
 * API Constants interface extending from @digitaldefiance/node-express-suite
 *
 * This interface extends the base IConstants from @digitaldefiance/node-express-suite,
 * which provides:
 * - PBKDF2: Password-based key derivation configuration
 * - CHECKSUM: SHA3 checksum configuration
 * - FEC: Forward error correction settings
 * - KEYRING: Keyring algorithm configuration
 * - ENCRYPTION: Encryption settings
 * - Express Configuration: Express app settings, CORS, CSP, etc.
 * - JWT: Base JWT configuration
 * - Session: Session management settings
 *
 * And adds API-specific constants:
 * - WRAPPED_KEY: Key wrapping operations
 *
 * @see {@link https://github.com/Digital-Defiance/node-express-suite} for base interface
 * @interface IApiConstants
 * @extends {IConstants}
 */
export interface IApiConstants extends IConstants {
  // All base constants (PBKDF2, CHECKSUM, FEC, KEYRING, ENCRYPTION, etc.)
  // are inherited from IConstants in @digitaldefiance/node-express-suite

  /**
   * Wrapped key constants for key wrapping operations
   */
  readonly WRAPPED_KEY: IWrappedKeyConsts;
}
