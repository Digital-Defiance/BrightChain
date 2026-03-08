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

import { CONSTANTS as BaseConstants } from '@brightchain/brightchain-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';
import { WRAPPED_KEY } from '@digitaldefiance/node-ecies-lib';
import { createExpressConstants } from '@digitaldefiance/node-express-suite';
import { IApiConstants } from './interfaces/api-constants';

const expressConsts = createExpressConstants({
  Site: 'BrightChain',
  SiteTagline: 'Privacy. Participation. Power.',
  SiteDescription:
    'Your files are broken into blocks and mixed with random data using XOR operations, making them appear completely random while maintaining perfect security. From homomorphic voting to brokered anonymity, from distributed file storage to quorum-based governance, BrightChain offers everything needed for the next generation of decentralized applications.',
});

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
  ...BaseConstants,
  ...expressConsts,
  PBKDF2_PROFILES: expressConsts.PBKDF2_PROFILES,
  WRAPPED_KEY,
  // BrightChain uses GuidV4 (16-byte) IDs rather than ObjectId (12-byte).
  // This ensures Environment generates GUIDs for systemId/adminId/memberId.
  idProvider: new GuidV4Provider(),
};
