import { CipherGCMTypes } from 'crypto';
import { ICBLConsts } from './interfaces/cblConsts';
import { IChecksumConsts } from './interfaces/checksumConsts';
import { IConstants } from './interfaces/constants';
import { IECIESConsts } from './interfaces/eciesConsts';
import { IEncryptionConsts } from './interfaces/encryptionConsts';
import { IFECConsts } from './interfaces/fecConsts';
import { IJwtConsts } from './interfaces/jwtConsts';
import { IKeyringConsts } from './interfaces/keyringConsts';
import { IPBkdf2Consts } from './interfaces/pbkdf2Consts';
import { ISealingConsts } from './interfaces/sealingConsts';
import { ISiteConsts } from './interfaces/siteConsts';
import { ITupleConsts } from './interfaces/tupleConsts';
import { IVotingConsts } from './interfaces/votingConsts';

export const UINT8_SIZE: number = 1 as const;
export const UINT16_SIZE: number = 2 as const;
export const UINT16_MAX: number = 65535 as const;
export const UINT32_SIZE: number = 4 as const;
export const UINT32_MAX: number = 4294967295 as const;
export const UINT64_SIZE: number = 8 as const;
export const UINT64_MAX: bigint = 18446744073709551615n as const;
/**
 * Standard size of a UUID v4 in bytes.
 */
export const GUID_SIZE: number = 16 as const;

export const SITE: ISiteConsts = {
  EMAIL_FROM: 'noreply@brightchain.io' as const,
  DOMAIN: 'localhost:3000' as const,
  CSP_NONCE_SIZE: 32 as const,
} as const;

export const JWT: IJwtConsts = {
  /**
   * Algorithm to use for JWT
   */
  ALGORITHM: 'HS256' as const,

  /**
   * The expiration time for a JWT token in seconds
   */
  EXPIRATION_SEC: 86400 as const,
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
 * Constants for ECIES (Elliptic Curve Integrated Encryption Scheme)
 * These values are critical for cryptographic operations and MUST NOT be changed
 * in an already established system as it will break all existing blocks.
 */
export const ECIES: IECIESConsts = {
  /** The elliptic curve to use for all ECDSA operations */
  CURVE_NAME: 'secp256k1' as const,

  /** The primary key derivation path for HD wallets */
  PRIMARY_KEY_DERIVATION_PATH: "m/44'/60'/0'/0/0" as const,

  /** Length of the authentication tag in bytes */
  AUTH_TAG_LENGTH: 16 as const,

  /** Length of the initialization vector in bytes */
  IV_LENGTH: 16 as const,

  /** Length of ECDSA signatures in bytes */
  SIGNATURE_LENGTH: 65 as const,

  /** Length of raw public keys in bytes (without 0x04 prefix) */
  RAW_PUBLIC_KEY_LENGTH: 64 as const,

  /** Length of public keys in bytes (with 0x04 prefix) */
  PUBLIC_KEY_LENGTH: 65 as const, // RAW_PUBLIC_KEY_LENGTH + 1

  PUBLIC_KEY_MAGIC: 0x04 as const,

  /** Mnemonic strength in bits. This will produce a 32-bit key for ECDSA */
  MNEMONIC_STRENGTH: 256 as const,

  /** Total overhead size for encrypted blocks (block type + public key + IV + auth tag) */
  OVERHEAD_SIZE: 98 as const, // BLOCK_TYPE_HEADER_SIZE + PUBLIC_KEY_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH

  /** Symmetric encryption algorithm configuration */
  SYMMETRIC: {
    ALGORITHM: 'aes' as const,
    KEY_BITS: 256 as const,
    KEY_LENGTH: 32 as const, // KEY_BITS / 8
    MODE: 'gcm' as const,
  },

  MULTIPLE: {
    // Corrected: IV (16) + AuthTag (16) + CRC16 (2) = 34
    ENCRYPTED_MESSAGE_OVERHEAD_SIZE: 34 as const, // 16 bytes IV + 16 bytes auth tag + 2 bytes CRC16 checksum
    // Corrected: DATA_LENGTH_SIZE (8) + RECIPIENT_COUNT_SIZE (2) = 10
    FIXED_OVERHEAD_SIZE: 10 as const, // 8 bytes data length + 2 bytes recipient count
    ENCRYPTED_KEY_SIZE: 129 as const, // 65 bytes ephemeral public key + 16 bytes IV + 16 bytes auth tag + 32 bytes encrypted key
    MAX_RECIPIENTS: UINT16_MAX,
    IV_SIZE: 16 as const,
    AUTH_TAG_SIZE: 16 as const,
    MAX_DATA_SIZE: 9007199254740991 as const, // 2^53 - 1
    RECIPIENT_ID_SIZE: GUID_SIZE,
    RECIPIENT_COUNT_SIZE: UINT16_SIZE,
    DATA_LENGTH_SIZE: UINT64_SIZE,
  },
} as const;

export const KEYRING: IKeyringConsts = {
  ALGORITHM: 'aes' as const,
  KEY_BITS: 256 as const,
  MODE: 'gcm' as const,
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
export const CHECKSUM: IChecksumConsts = {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: 512 as const,

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_BUFFER_LENGTH: 64 as const,

  /** algorithm to use for checksum */
  ALGORITHM: 'sha3-512' as const,

  /** encoding to use for checksum */
  ENCODING: 'hex' as const,
} as const;

/**
 * Constants for encrypted blocks
 */
export const ENCRYPTION: IEncryptionConsts = {
  ENCRYPTION_TYPE_SIZE: 1 as const,
  RECIPIENT_ID_SIZE: GUID_SIZE,
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
 * Constants for voting operations
 * These values affect how voting keys are derived and validated
 */
export const VOTING: IVotingConsts = {
  /** Info string used in HKDF for prime generation */
  PRIME_GEN_INFO: 'PaillierPrimeGen' as const,

  /** Number of iterations for Miller-Rabin primality test */
  PRIME_TEST_ITERATIONS: 256 as const,

  KEYPAIR_BIT_LENGTH: 3072 as const,

  /** Offset of the public key in the key pair buffer */
  PUB_KEY_OFFSET: 768 as const,

  HKDF_LENGTH: 64 as const,

  HMAC_ALGORITHM: 'sha512' as const,

  HASH_ALGORITHM: 'sha256' as const,

  BITS_RADIX: 2 as const,

  KEY_RADIX: 16 as const,

  KEY_FORMAT: 'hex' as const,

  DIGEST_FORMAT: 'hex' as const,

  /** Current version of the voting key format */
  KEY_VERSION: 1 as const,

  /** Magic identifier for voting keys */
  KEY_MAGIC: 'BCVK' as const, // BrightChain Voting Key

  DRBG_PRIME_ATTEMPTS: 20000 as const,
} as const;

export const FEC: IFECConsts = {
  /**
   * Maximum size of a single shard
   */
  MAX_SHARD_SIZE: 1048576 as const, // BlockSize.Medium
} as const;

export const PBKDF2: IPBkdf2Consts = {
  ALGORITHM: 'sha512' as const,
  SALT_BYTES: 16 as const,
  /**
   * Number of pbkdf2 iterations per second when hashing a password.
   */
  ITERATIONS_PER_SECOND: 1304000 as const,
} as const;

export const SEALING: ISealingConsts = {
  MIN_SHARES: 2 as const,
  MAX_SHARES: 1048575 as const,
} as const;

export const CONSTANTS: IConstants = {
  CBL,
  OFFS_CACHE_PERCENTAGE,
  ECIES,
  FEC,
  CHECKSUM,
  ENCRYPTION,
  TUPLE,
  VOTING,
  KEYRING,
  SEALING,
  PBKDF2,
  JWT,
  SITE,
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
  HEX_RADIX: 16,
  GUID_SIZE,
};

export default CONSTANTS;
