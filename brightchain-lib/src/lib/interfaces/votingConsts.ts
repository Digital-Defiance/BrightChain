import { BinaryToTextEncoding } from 'crypto';

export interface IVotingConsts {
  /** Info string used in HKDF for prime generation */
  PRIME_GEN_INFO: string;

  /** Number of iterations for Miller-Rabin primality test */
  PRIME_TEST_ITERATIONS: number;

  /** Length of the key pair in bits */
  KEYPAIR_BIT_LENGTH: number;

  /** Offset of the public key in the key pair */
  PUB_KEY_OFFSET: number;

  /** Length of the HKDF output */
  HKDF_LENGTH: number;

  /** Radix of bits portion */
  BITS_RADIX: number;

  /** Radix of the key */
  KEY_RADIX: number;

  /** Key format (hex, base64, etc) */
  KEY_FORMAT: BufferEncoding;

  /** Digest format */
  DIGEST_FORMAT: BinaryToTextEncoding;

  /** HMAC algorithm */
  HMAC_ALGORITHM: string;

  /** Hashing algorithm (sha256) */
  HASH_ALGORITHM: string;

  /** Current version of the key format */
  KEY_VERSION: number;

  /** Magic identifier for the key format */
  KEY_MAGIC: string;

  /** Number of prime attempts before failure */
  DRBG_PRIME_ATTEMPTS: number;
}
