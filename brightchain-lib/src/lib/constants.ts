import { CipherGCMTypes } from 'crypto';
import { IJwtConfiguration } from './interfaces/jwtConfiguration';

export const SITE = {
  EMAIL_FROM: 'noreply@brightchain.io',
  DOMAIN: 'localhost:3000',
} as const;

export const JWT: IJwtConfiguration = {
  /**
   * Algorithm to use for JWT
   */
  ALGORITHM: 'HS256',

  /**
   * The expiration time for a JWT token in seconds
   */
  EXPIRATION_SEC: 86400,
} as const;

/**
 * Constants for block overhead sizes
 */
export const CBL_OVERHEAD_SIZE = 102;
export const ECIES_OVERHEAD_SIZE = 97;

/**
 * Constants for OFFS whitener generation
 */
export const OFFS_CACHE_PERCENTAGE = 0.7; // 70% from cache, 30% new random blocks

/**
 * Constants for ECIES (Elliptic Curve Integrated Encryption Scheme)
 * These values are critical for cryptographic operations and MUST NOT be changed
 * in an already established system as it will break all existing blocks.
 */
export const ECIES = {
  /** The elliptic curve to use for all ECDSA operations */
  CURVE_NAME: 'secp256k1',

  /** The primary key derivation path for HD wallets */
  PRIMARY_KEY_DERIVATION_PATH: "m/44'/60'/0'/0/0",

  /** Length of the authentication tag in bytes */
  AUTH_TAG_LENGTH: 16,

  /** Length of the initialization vector in bytes */
  IV_LENGTH: 16,

  /** Length of ECDSA signatures in bytes */
  SIGNATURE_LENGTH: 65,

  /** Length of raw public keys in bytes (without 0x04 prefix) */
  RAW_PUBLIC_KEY_LENGTH: 64,

  /** Length of public keys in bytes (with 0x04 prefix) */
  PUBLIC_KEY_LENGTH: 65, // RAW_PUBLIC_KEY_LENGTH + 1

  PUBLIC_KEY_MAGIC: 0x04,

  /** Mnemonic strength in bits. This will produce a 32-bit key for ECDSA */
  MNEMONIC_STRENGTH: 256,

  OVERHEAD_SIZE: 97,

  /** Symmetric encryption algorithm configuration */
  SYMMETRIC: {
    ALGORITHM: 'aes',
    KEY_BITS: 256,
    KEY_LENGTH: 32, // KEY_BITS / 8
    MODE: 'gcm',
  },
} as const;

export const KEYRING = {
  ALGORITHM: 'aes',
  KEY_BITS: 256,
  MODE: 'gcm',
} as const;

export const ECIES_OVERHEAD_LENGTH =
  ECIES.PUBLIC_KEY_LENGTH + // Include 0x04 prefix since we store it
  ECIES.IV_LENGTH +
  ECIES.AUTH_TAG_LENGTH;

export const ECIES_MULTIPLE_MESSAGE_OVERHEAD_LENGTH =
  ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH;

export const KEYRING_ALGORITHM_CONFIGURATION =
  `${KEYRING.ALGORITHM}-${KEYRING.KEY_BITS}-${KEYRING.MODE}` as CipherGCMTypes;

/**
 * Type for symmetric algorithm configuration
 */
export const SYMMETRIC_ALGORITHM_CONFIGURATION =
  `${ECIES.SYMMETRIC.ALGORITHM}-${ECIES.SYMMETRIC.KEY_BITS}-${ECIES.SYMMETRIC.MODE}` as CipherGCMTypes;

/**
 * Constants for checksum operations
 * These values are critical for data integrity and MUST NOT be changed
 * in an already established system as it will break all existing checksums.
 */
export const CHECKSUM = {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: 512,

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_BUFFER_LENGTH: 64,

  ALGORITHM: 'sha3-512',
  ENCODING: 'hex' as const,
} as const;

/**
 * Constants for tuple operations
 * These values affect how tuples are constructed and processed
 */
export const TUPLE = {
  /** Minimum number of random blocks in a tuple */
  MIN_RANDOM_BLOCKS: 2,

  /** Maximum number of random blocks in a tuple */
  MAX_RANDOM_BLOCKS: 5,

  /**
   * Constants for tuple operations
   */
  RANDOM_BLOCKS_PER_TUPLE: 2,
  SIZE: 3,
  MIN_SIZE: 2,
  MAX_SIZE: 10,
} as const;

/**
 * Constants for voting operations
 * These values affect how voting keys are derived and validated
 */
export const VOTING = {
  /** Info string used in HKDF for prime generation */
  PRIME_GEN_INFO: 'PaillierPrimeGen',

  /** Number of iterations for Miller-Rabin primality test */
  PRIME_TEST_ITERATIONS: 256,

  KEYPAIR_BIT_LENGTH: 3072,

  PUB_KEY_OFFSET: 768,
  HKDF_LENGTH: 64,

  KEY_VERSION: 1,
  KEY_MAGIC: Buffer.from('BCVK'), // BrightChain Voting Key
} as const;

export const FEC = {
  /**
   * Maximum size of a single shard
   */
  MAX_SHARD_SIZE: 1048576, // BlockSize.Medium
} as const;

export const PBKDF2 = {
  SALT_BYTES: 16,
  /**
   * Number of pbkdf2 iterations per second when hashing a password.
   */
  ITERATIONS_PER_SECOND: 1304000,
} as const;

export const SEALING = {
  MIN_SHARES: 2,
  MAX_SHARES: 1048575,
} as const;

export default {
  CBL_OVERHEAD_SIZE,
  ECIES_OVERHEAD_SIZE,
  OFFS_CACHE_PERCENTAGE,
  ECIES,
  FEC,
  CHECKSUM,
  TUPLE,
  VOTING,
  KEYRING,
  SEALING,
  PBKDF2,
  JWT,
  SITE,
  ECIES_MULTIPLE_MESSAGE_OVERHEAD_LENGTH,
  KEYRING_ALGORITHM_CONFIGURATION,
  SYMMETRIC_ALGORITHM_CONFIGURATION,
};
