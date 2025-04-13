/**
 * Interface definitions for BrightChain constants
 */

export interface IConstants {
  [key: string]: any;
}

export interface ICBLConsts {
  /**
   * Base header size for CBL
   */
  readonly BASE_OVERHEAD: number;
  /**
   * MIME validation pattern
   */
  readonly MIME_TYPE_PATTERN: RegExp;
  /**
   * File name validation pattern
   */
  readonly FILE_NAME_PATTERN: RegExp;
  /**
   * File name path traversal pattern
   */
  readonly FILE_NAME_TRAVERSAL_PATTERN: RegExp;
  /**
   * Maximum allowed length for file names in Encrypted Content-Based Layer (ECBL).
   * This limit (typically around 255 characters) aligns with common file system standards
   * and helps mitigate risks such as denial of service attacks.
   */
  readonly MAX_FILE_NAME_LENGTH: number;
  /**
   * Maximum allowed length for MIME types in Encrypted Content-Based Layer (ECBL).
   * This constraint is based on standard MIME type lengths, ensuring room for custom
   * parameters while preventing misuse.
   */
  readonly MAX_MIME_TYPE_LENGTH: number;
  /**
   * 9,007,199,254,740,991 bytes
   */
  readonly MAX_INPUT_FILE_SIZE: number;
}

export interface IFECConsts {
  readonly REDUNDANCY_FACTOR: number;
  readonly MIN_REDUNDANCY: number;
  readonly MAX_REDUNDANCY: number;
  /** Maximum size of a single shard */
  readonly MAX_SHARD_SIZE: number;
}

export interface ITupleConsts {
  /** Minimum number of random blocks in a tuple */
  readonly MIN_RANDOM_BLOCKS: number;

  /** Maximum number of random blocks in a tuple */
  readonly MAX_RANDOM_BLOCKS: number;

  /** Constants for tuple operations */
  readonly RANDOM_BLOCKS_PER_TUPLE: number;

  /** Size of a tuple */
  readonly SIZE: number;

  /** Minimum size of a tuple */
  readonly MIN_SIZE: number;

  /** Maximum size of a tuple */
  readonly MAX_SIZE: number;
}

export interface ISealingConsts {
  /** Minimum number of shares required to seal a document */
  readonly MIN_SHARES: number;
  /** Maximum number of shares allowed to seal a document */
  readonly MAX_SHARES: number;
  readonly DEFAULT_THRESHOLD: number;
}

export interface ISiteConsts {
  readonly NAME: string;
  readonly VERSION: string;
  readonly DESCRIPTION: string;
  readonly EMAIL_FROM: string;
  readonly DOMAIN: string;
  readonly CSP_NONCE_SIZE: number;
}

export interface IJwtConsts {
  /**
   * Algorithm to use for JWT
   */
  readonly ALGORITHM:
    | 'HS256'
    | 'HS384'
    | 'HS512'
    | 'RS256'
    | 'RS384'
    | 'RS512'
    | 'ES256'
    | 'ES384'
    | 'ES512'
    | 'PS256'
    | 'PS384'
    | 'PS512';

  /**
   * The expiration time for a JWT token in seconds
   */
  readonly EXPIRATION_SEC: number;
  readonly ISSUER: string;
}
