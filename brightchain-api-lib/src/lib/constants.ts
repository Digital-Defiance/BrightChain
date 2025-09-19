import { GUID_SIZE, IPBkdf2Consts } from '@brightchain/brightchain-lib';
import { CipherGCMTypes } from 'crypto';
import { IApiConstants } from './interfaces/api-constants';
import { IChecksumConsts } from './interfaces/checksum-consts';
import { IEncryptionConsts } from './interfaces/encryption-consts';
import { IFECConsts } from './interfaces/fec-consts';
import { IKeyringConsts } from './interfaces/keyring-consts';
import { PbkdfProfiles } from './interfaces/pbkdf-profiles';
import { IWrappedKeyConsts } from './interfaces/wrapped-key-consts';

/**
 * Constants for checksum operations
 * These values are critical for data integrity and MUST NOT be changed
 * in an already established system as it will break all existing checksums.
 */
export const CHECKSUM: IChecksumConsts = {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: 512 as const,

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_ARRAY_LENGTH: 64 as const,

  /** algorithm to use for checksum */
  ALGORITHM: 'sha3-512' as const,

  /** encoding to use for checksum */
  ENCODING: 'hex' as const,
} as const;

export const KEYRING: IKeyringConsts = {
  ALGORITHM: 'aes' as const,
  KEY_BITS: 256 as const,
  MODE: 'gcm' as const,
} as const;

export const PBKDF2: IPBkdf2Consts = {
  ALGORITHM: 'sha256' as const, // Changed from sha512 to match key-wrapping
  SALT_BYTES: 32 as const, // Changed from 16 to match key-wrapping and improve security
  /**
   * Number of pbkdf2 iterations per second when hashing a password.
   * This is the high-security default for user login operations.
   */
  ITERATIONS_PER_SECOND: 1304000 as const,
} as const;

/**
 * Predefined PBKDF2 configuration profiles for different use cases
 * These profiles provide standardized, well-tested parameter combinations
 */
export const PBKDF2_PROFILES: PbkdfProfiles = {
  /** High-security profile for user login operations */
  USER_LOGIN: {
    saltBytes: 32,
    iterations: 1304000,
    algorithm: 'sha256',
    hashBytes: 32,
  },
  /** Optimized profile for key-wrapping operations */
  KEY_WRAPPING: {
    saltBytes: 32,
    iterations: 100000,
    algorithm: 'sha256',
    hashBytes: 32,
  },
  /** Standard profile for backup codes and general use */
  BACKUP_CODES: {
    saltBytes: 32,
    iterations: 1304000,
    algorithm: 'sha256',
    hashBytes: 32,
  },
  /** Ultra-high security profile for sensitive operations */
  HIGH_SECURITY: {
    saltBytes: 64,
    iterations: 2000000,
    algorithm: 'sha512',
    hashBytes: 64,
  },
  /** Fast profile for testing and development */
  FAST_TEST: {
    saltBytes: 16,
    iterations: 1000,
    algorithm: 'sha256',
    hashBytes: 32,
  },
} as const;

export const WRAPPED_KEY: IWrappedKeyConsts = {
  SALT_SIZE: PBKDF2.SALT_BYTES, // Use PBKDF2 standard salt size
  IV_SIZE: 16 as const,
  MASTER_KEY_SIZE: 32 as const,
  MIN_ITERATIONS: 100000 as const, // Keep lower for key-wrapping operations
} as const;

export const KEYRING_ALGORITHM_CONFIGURATION =
  `${KEYRING.ALGORITHM}-${KEYRING.KEY_BITS}-${KEYRING.MODE}` as CipherGCMTypes;

/**
 * Constants for encrypted data
 */
export const ENCRYPTION: IEncryptionConsts = {
  ENCRYPTION_TYPE_SIZE: 1 as const,
  RECIPIENT_ID_SIZE: GUID_SIZE,
} as const;

export const FEC: IFECConsts = {
  /**
   * Maximum size of a single shard
   */
  MAX_SHARD_SIZE: 1048576 as const,
} as const;

export const ApiConstants: IApiConstants = {
  /**
   * PBKDF2 constants
   */
  PBKDF2: PBKDF2,
  /**
   * PBKDF2 configuration profiles
   */
  PBKDF2_PROFILES: PBKDF2_PROFILES,
  /**
   * Key Wrapping Service constants
   */
  WRAPPED_KEY: WRAPPED_KEY,
  /**
   * Checksum constants used for data integrity
   */
  CHECKSUM: CHECKSUM,
  /**
   * Forward Error Correction constants used for data recovery
   */
  FEC: FEC,
  /**
   * Keyring constants used for key management
   */
  KEYRING: KEYRING,
  /**
   * Encryption constants used for encrypted data
   */
  ENCRYPTION: ENCRYPTION,
  /**
   * Algorithm configuration string for keyring operations
   */
  KEYRING_ALGORITHM_CONFIGURATION: KEYRING_ALGORITHM_CONFIGURATION,
} as const;

if (
  CHECKSUM.SHA3_ARRAY_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8 ||
  CHECKSUM.SHA3_ARRAY_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8
) {
  throw new Error('Invalid checksum constants');
}
