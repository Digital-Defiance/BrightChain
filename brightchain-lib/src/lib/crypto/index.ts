/**
 * Crypto utilities module for brightchain-lib.
 *
 * This module exports platform-agnostic cryptographic utilities that work
 * in both browser and Node.js environments.
 *
 * @module crypto
 * @see Requirement 11.1
 */

export {
  // Class implementation
  PlatformCrypto,
  // Crypto utility functions
  getRandomBytes,
  // Environment detection functions
  isBrowserEnvironment,
  isNodeEnvironment,
  sha1Hash,
  sha1HashBytes,
} from './platformCrypto';
export type { IPlatformCrypto } from './platformCrypto';
