/**
 * BrightChain Constants Module
 *
 * This module extends base cryptographic constants from @digitaldefiance/ecies-lib
 * and adds BrightChain-specific constants for blockchain operations.
 *
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for base constants
 * @module constants
 */

import { Constants as BaseConstants } from '@digitaldefiance/ecies-lib';
import { BRIGHTCHAIN_ECIES } from './brightChainConsts';
import {
  ICBLConsts,
  IConstants,
  IFECConsts,
  IJwtConsts,
  ISealingConsts,
  ISiteConsts,
  ITupleConsts,
} from './interfaces/constants';

/**
 * ECIES constants for BrightChain (extends base ECIES with BrightChain-specific values)
 * Re-exported for backward compatibility
 */
export const ECIES = BRIGHTCHAIN_ECIES;

/**
 * Re-export CHECKSUM from base constants for backward compatibility
 * Using local definition to match BrightChain's specific checksum configuration
 */
export const CHECKSUM = {
  SHA3_DEFAULT_HASH_BITS: 512 as const,
  SHA3_BUFFER_LENGTH: 64 as const,
  ALGORITHM: 'sha3-512' as const,
  ENCODING: 'hex' as const,
} as const;

/**
 * ENCRYPTION constants - derived from base constants
 * Re-exported for backward compatibility
 */
export const ENCRYPTION = {
  ENCRYPTION_TYPE_SIZE: 1 as const,
  RECIPIENT_ID_SIZE: 16 as const, // GuidV4 size (16 bytes)
} as const;

/**
 * Symmetric algorithm configuration string
 * Re-exported for backward compatibility
 */
export const SYMMETRIC_ALGORITHM_CONFIGURATION = 'aes-256-gcm' as const;

/**
 * Keyring algorithm configuration string (same as symmetric)
 * Re-exported for backward compatibility
 */
export const KEYRING_ALGORITHM_CONFIGURATION =
  SYMMETRIC_ALGORITHM_CONFIGURATION;

/**
 * GUID size in bytes (GuidV4 uses 16 bytes)
 * Re-exported for backward compatibility
 */
export const GUID_SIZE = 16 as const;

/**
 * ECIES overhead length (computed from ECIES constants)
 * Re-exported for backward compatibility
 */
export const ECIES_OVERHEAD_LENGTH =
  ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE;

/**
 * ECIES multiple message overhead length (computed from ECIES constants)
 * Re-exported for backward compatibility
 */
export const ECIES_MULTIPLE_MESSAGE_OVERHEAD_LENGTH =
  ECIES.IV_SIZE + ECIES.AUTH_TAG_SIZE;

/**
 * PBKDF2 profiles - re-exported from @digitaldefiance/ecies-lib for backward compatibility
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for source
 */
export const PBKDF2_PROFILES = BaseConstants.PBKDF2_PROFILES;

/**
 * PBKDF2 constants - re-exported from @digitaldefiance/ecies-lib for backward compatibility
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for source
 */
export const PBKDF2 = BaseConstants.PBKDF2;

/**
 * VOTING constants - re-exported from @digitaldefiance/ecies-lib for backward compatibility
 * Includes Paillier homomorphic encryption configuration for privacy-preserving voting
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for source
 */
export const VOTING = BaseConstants.VOTING;

/**
 * Keyring constants (same as ECIES symmetric)
 * Re-exported for backward compatibility
 */
export const KEYRING = {
  ALGORITHM: 'aes' as const,
  KEY_BITS: 256 as const,
  MODE: 'gcm' as const,
} as const;

/**
 * UINT sizes - re-exported from @digitaldefiance/ecies-lib for backward compatibility
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for source
 */
export const UINT8_SIZE = BaseConstants.UINT8_SIZE;
export const UINT16_SIZE = BaseConstants.UINT16_SIZE;
export const UINT16_MAX = BaseConstants.UINT16_MAX;
export const UINT32_SIZE = BaseConstants.UINT32_SIZE;
export const UINT32_MAX = BaseConstants.UINT32_MAX;
export const UINT64_SIZE = BaseConstants.UINT64_SIZE;
export const UINT64_MAX = BaseConstants.UINT64_MAX;

/**
 * HEX_RADIX - re-exported from @digitaldefiance/ecies-lib for backward compatibility
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for source
 */
export const HEX_RADIX = BaseConstants.HEX_RADIX;

/**
 * Site-specific constants for BrightChain
 */
export const SITE: ISiteConsts = {
  NAME: 'BrightChain' as const,
  VERSION: '1.0.0' as const,
  DESCRIPTION: 'BrightChain' as const,
  EMAIL_FROM: 'noreply@brightchain.io' as const,
  DOMAIN: 'localhost:3000' as const,
  CSP_NONCE_SIZE: 32 as const,
} as const;

/**
 * JWT configuration constants for BrightChain
 */
export const JWT: IJwtConsts = {
  /**
   * Algorithm to use for JWT
   */
  ALGORITHM: 'HS256' as const,

  /**
   * The expiration time for a JWT token in seconds
   */
  EXPIRATION_SEC: 86400 as const,
  ISSUER: 'brightchain' as const,
} as const;

/**
 * Constants for CBL (Constituent Block List)
 */
export const CBL: ICBLConsts = {
  BASE_OVERHEAD: 170 as const,
  /**
   * Mime type regex pattern for extended cbl
   */
  MIME_TYPE_PATTERN: /^[a-z0-9-]+\/[a-z0-9-]+$/,

  /**
   * Regex pattern for valid file names
   */
  FILE_NAME_PATTERN: /^[^<>:"/\\|?*]+$/,

  /**
   * Regex pattern for file name traversal
   */
  FILE_NAME_TRAVERSAL_PATTERN: /(^|[\\/])\.\.($|[\\/])/,

  /**
   * Max length for file names
   */
  MAX_FILE_NAME_LENGTH: 255,

  /**
   * Max length for mime types
   */
  MAX_MIME_TYPE_LENGTH: 127,

  /**
   * Max size for input files
   */
  MAX_INPUT_FILE_SIZE: 9007199254740991 as const, // 2^53 - 1, max safe integer for JS
};

/**
 * Constants for OFFS whitener generation
 */
export const OFFS_CACHE_PERCENTAGE = 0.7 as const; // 70% from cache, 30% new random blocks

/**
 * Constants for FEC (Forward Error Correction)
 */
export const FEC: IFECConsts = {
  /**
   * Maximum size of a single shard
   */
  MAX_SHARD_SIZE: 1048576 as const, // BlockSize.Medium
  MIN_REDUNDANCY: 2 as const,
  REDUNDANCY_FACTOR: 1.5 as const,
  MAX_REDUNDANCY: 5 as const,
} as const;

/**
 * Constants for tuple operations
 * These values affect how tuples are constructed and processed
 */
export const TUPLE: ITupleConsts = {
  /** Minimum number of random blocks in a tuple */
  MIN_RANDOM_BLOCKS: 2 as const,

  /** Maximum number of random blocks in a tuple */
  MAX_RANDOM_BLOCKS: 5 as const,

  /** Constants for tuple operations */
  RANDOM_BLOCKS_PER_TUPLE: 2 as const,

  /** Number of blocks in a tuple */
  SIZE: 3 as const,

  /** Minimum size of a tuple */
  MIN_SIZE: 2 as const,

  /** Maximum size of a tuple */
  MAX_SIZE: 10 as const,
} as const;

/**
 * Constants for sealing operations
 */
export const SEALING: ISealingConsts = {
  MIN_SHARES: 2 as const,
  MAX_SHARES: 1048575 as const,
  DEFAULT_THRESHOLD: 3 as const,
} as const;

/**
 * BrightChain constants object extending base constants from @digitaldefiance/ecies-lib.
 * Only includes BrightChain-specific constants not provided by upstream.
 */
export const CONSTANTS: IConstants = {
  ...BaseConstants,
  // BrightChain-specific constants
  CBL,
  OFFS_CACHE_PERCENTAGE,
  FEC,
  TUPLE,
  SEALING,
  JWT,
  SITE,
  // Re-exported for backward compatibility
  PBKDF2_PROFILES,
  PBKDF2,
  VOTING,
  CHECKSUM,
  ENCRYPTION,
  KEYRING,
  ECIES_OVERHEAD_LENGTH,
  ECIES_MULTIPLE_MESSAGE_OVERHEAD_LENGTH,
  KEYRING_ALGORITHM_CONFIGURATION,
  SYMMETRIC_ALGORITHM_CONFIGURATION,
  UINT8_SIZE,
  UINT16_SIZE,
  UINT16_MAX,
  UINT32_SIZE,
  UINT32_MAX,
  UINT64_SIZE,
  UINT64_MAX,
  HEX_RADIX,
  GUID_SIZE,
  // BACKUP_CODES is not used in the codebase, but included for interface compatibility
  BACKUP_CODES: {
    Count: 10,
    NormalizedHexRegex: /^[a-z0-9]{32}$/,
    DisplayRegex: /^([a-z0-9]{4}-){7}[a-z0-9]{4}$/,
  },
};

export default CONSTANTS;
