/**
 * Interface definitions for BrightChain constants
 */

/**
 * Constants for Constituent Block List (CBL) operations
 *
 * @remarks
 * These constants define validation rules, size limits, and patterns for
 * CBL operations, including file name and MIME type validation.
 *
 * @example
 * ```typescript
 * const cblConsts: ICBLConsts = {
 *   BASE_OVERHEAD: 128,
 *   MIME_TYPE_PATTERN: /^[\w-]+\/[\w-]+$/,
 *   FILE_NAME_PATTERN: /^[^\/\\]+$/,
 *   FILE_NAME_TRAVERSAL_PATTERN: /\.\./,
 *   MAX_FILE_NAME_LENGTH: 255,
 *   MAX_MIME_TYPE_LENGTH: 127,
 *   MAX_INPUT_FILE_SIZE: 9007199254740991
 * };
 * ```
 */
export interface ICBLConsts {
  /**
   * Base header size for CBL in bytes
   * @remarks This is the fixed overhead for CBL metadata
   */
  readonly BASE_OVERHEAD: number;

  /**
   * Regular expression pattern for validating MIME types
   * @remarks Ensures MIME types follow the standard format (e.g., 'text/plain')
   */
  readonly MIME_TYPE_PATTERN: RegExp;

  /**
   * Regular expression pattern for validating file names
   * @remarks Prevents invalid characters in file names
   */
  readonly FILE_NAME_PATTERN: RegExp;

  /**
   * Regular expression pattern for detecting path traversal attempts
   * @remarks Detects '..' sequences that could be used for directory traversal attacks
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
   * Maximum input file size in bytes (9,007,199,254,740,991 bytes)
   * @remarks This is the maximum safe integer in JavaScript (Number.MAX_SAFE_INTEGER)
   */
  readonly MAX_INPUT_FILE_SIZE: number;
}

/**
 * Constants for Forward Error Correction (FEC) operations
 *
 * @remarks
 * These constants control the redundancy and shard size limits for FEC encoding,
 * which provides data recovery capabilities in case of block loss.
 *
 * @example
 * ```typescript
 * const fecConsts: IFECConsts = {
 *   REDUNDANCY_FACTOR: 1.5,
 *   MIN_REDUNDANCY: 1.1,
 *   MAX_REDUNDANCY: 3.0,
 *   MAX_SHARD_SIZE: 1048576
 * };
 * ```
 */
export interface IBCFECConsts {
  /**
   * Default redundancy factor for FEC encoding
   * @remarks A factor of 1.5 means 50% additional parity data
   */
  readonly REDUNDANCY_FACTOR: number;

  /**
   * Minimum allowed redundancy factor
   * @remarks Must be greater than 1.0 to provide any redundancy
   */
  readonly MIN_REDUNDANCY: number;

  /**
   * Maximum allowed redundancy factor
   * @remarks Higher values provide more recovery capability but increase storage
   */
  readonly MAX_REDUNDANCY: number;

  /**
   * Maximum size of a single shard in bytes
   * @remarks Limits memory usage during FEC operations
   */
  readonly MAX_SHARD_SIZE: number;
}

/**
 * Constants for tuple operations
 *
 * @remarks
 * Tuples in BrightChain combine data blocks with random blocks for obfuscation.
 * These constants define the size constraints and composition rules for tuples.
 *
 * @example
 * ```typescript
 * const tupleConsts: ITupleConsts = {
 *   MIN_RANDOM_BLOCKS: 2,
 *   MAX_RANDOM_BLOCKS: 5,
 *   RANDOM_BLOCKS_PER_TUPLE: 3,
 *   SIZE: 8,
 *   MIN_SIZE: 4,
 *   MAX_SIZE: 16
 * };
 * ```
 */
export interface ITupleConsts {
  /**
   * Minimum number of random blocks in a tuple
   * @remarks Ensures sufficient obfuscation
   */
  readonly MIN_RANDOM_BLOCKS: number;

  /**
   * Maximum number of random blocks in a tuple
   * @remarks Limits overhead from random blocks
   */
  readonly MAX_RANDOM_BLOCKS: number;

  /**
   * Default number of random blocks per tuple
   * @remarks Used when no specific count is provided
   */
  readonly RANDOM_BLOCKS_PER_TUPLE: number;

  /**
   * Default size of a tuple (total number of blocks)
   * @remarks Includes both data and random blocks
   */
  readonly SIZE: number;

  /**
   * Minimum allowed tuple size
   * @remarks Must be large enough to include minimum random blocks
   */
  readonly MIN_SIZE: number;

  /**
   * Maximum allowed tuple size
   * @remarks Limits memory and processing overhead
   */
  readonly MAX_SIZE: number;
}

/**
 * Constants for document sealing operations using Shamir's Secret Sharing
 *
 * @remarks
 * These constants define the constraints for multi-party document sealing,
 * where a document can only be unsealed when a threshold number of shares
 * are provided.
 *
 * @example
 * ```typescript
 * const sealingConsts: ISealingConsts = {
 *   MIN_SHARES: 2,
 *   MAX_SHARES: 10,
 *   DEFAULT_THRESHOLD: 3
 * };
 * ```
 */
export interface ISealingConsts {
  /**
   * Minimum number of shares required to seal a document
   * @remarks Must be at least 2 for meaningful secret sharing
   */
  readonly MIN_SHARES: number;

  /**
   * Maximum number of shares allowed to seal a document
   * @remarks Limits computational overhead and complexity
   */
  readonly MAX_SHARES: number;

  /**
   * Default threshold for unsealing (number of shares required)
   * @remarks Typically set to a majority of total shares
   */
  readonly DEFAULT_THRESHOLD: number;
}

/**
 * Site-wide configuration constants
 *
 * @remarks
 * These constants define basic site information and security settings
 * used throughout the application.
 *
 * @example
 * ```typescript
 * const siteConsts: ISiteConsts = {
 *   NAME: 'BrightChain',
 *   VERSION: '1.0.0',
 *   DESCRIPTION: 'Distributed storage system',
 *   EMAIL_FROM: 'noreply@brightchain.io',
 *   DOMAIN: 'brightchain.io',
 *   CSP_NONCE_SIZE: 16
 * };
 * ```
 */
export interface ISiteConsts {
  /** Name of the site/application */
  readonly NAME: string;

  /** Current version of the site/application */
  readonly VERSION: string;

  /** Brief description of the site/application */
  readonly DESCRIPTION: string;

  /** Default 'from' email address for system emails */
  readonly EMAIL_FROM: string;

  /** Primary domain name for the site */
  readonly DOMAIN: string;

  /**
   * Size of Content Security Policy nonce in bytes
   * @remarks Used for inline script security
   */
  readonly CSP_NONCE_SIZE: number;
}

import type { IConstants as IEciesConstants } from '@digitaldefiance/ecies-lib';

/**
 * Main constants interface that combines all BrightChain-specific constants
 * and extends the base constants from ecies-lib
 *
 * @remarks
 * This interface provides a unified type for all constants used throughout
 * the BrightChain system, including both inherited and BrightChain-specific constants.
 *
 * @example
 * ```typescript
 * import { IConstants } from './interfaces/constants';
 * import { CONSTANTS } from './constants';
 *
 * const constants: IConstants = CONSTANTS;
 * console.log(constants.CBL.MAX_FILE_NAME_LENGTH);
 * console.log(constants.TUPLE.SIZE);
 * ```
 */
export interface IConstants extends IEciesConstants {
  /** Constituent Block List constants */
  readonly CBL: ICBLConsts;

  /** Forward Error Correction constants */
  readonly BC_FEC: IBCFECConsts;

  /** Tuple operation constants */
  readonly TUPLE: ITupleConsts;

  /** Document sealing constants */
  readonly SEALING: ISealingConsts;

  /** Site configuration constants */
  readonly SITE: ISiteConsts;

  /** OFFS cache percentage */
  readonly OFFS_CACHE_PERCENTAGE: number;
}
