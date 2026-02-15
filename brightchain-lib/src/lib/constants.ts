/**
 * BrightChain Constants Module
 *
 * This module provides BrightChain-specific constants for blockchain operations.
 * For ECIES/encryption constants, import directly from @digitaldefiance/ecies-lib:
 *   import { ECIES, CHECKSUM, ENCRYPTION } from '@digitaldefiance/ecies-lib';
 *
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for base constants
 * @module constants
 */

import { Constants as BaseConstants } from '@digitaldefiance/ecies-lib';
import {
  IConstants as ISuiteCoreConstants,
  createConstants,
} from '@digitaldefiance/suite-core-lib';
import {
  IBCFECConsts,
  ICBLConsts,
  IConstants,
  ISealingConsts,
  ISiteConsts,
  ITupleConsts,
} from './interfaces/constants';

/**
 * Site-specific constants for BrightChain
 */
export const SITE: ISiteConsts = {
  NAME: 'BrightChain' as const,
  VERSION: '1.0.0' as const,
  DESCRIPTION: 'BrightChain' as const,
  EMAIL_FROM: 'noreply@brightchain.org' as const,
  DOMAIN: 'localhost:3000' as const,
  CSP_NONCE_SIZE: 32 as const,
} as const;

/**
 * BrightChain theme colors
 */
export const THEME_COLORS = {
  CHAIN_BLUE: '#1976d2' as const,
  CHAIN_BLUE_LIGHT: '#42a5f5' as const,
  CHAIN_BLUE_DARK: '#1565c0' as const,
  BRIGHT_CYAN: '#00bcd4' as const,
  BRIGHT_CYAN_LIGHT: '#4dd0e1' as const,
  BRIGHT_CYAN_DARK: '#0097a7' as const,
  CRYPTO_PURPLE: '#9c27b0' as const,
  SECURE_GREEN: '#4caf50' as const,
  ALERT_ORANGE: '#ff9800' as const,
  ERROR_RED: '#f44336' as const,
} as const;

/**
 * Constants for structured block headers
 */
export const BLOCK_HEADER = {
  /**
   * Magic prefix for BrightChain structured blocks (0xBC = "BrightChain")
   * This prefix identifies blocks with serialized headers (CBL variants)
   * Raw data blocks do NOT have this prefix
   */
  MAGIC_PREFIX: 0xbc as const,

  /**
   * Current version of the block header format
   */
  VERSION: 0x01 as const,
} as const;

/**
 * Structured block type identifiers (second byte after magic prefix)
 * These apply only to blocks with the 0xBC magic prefix
 */
export enum StructuredBlockType {
  /**
   * Constituent Block List - references to other blocks
   */
  CBL = 0x02,

  /**
   * SuperCBL - hierarchical CBL referencing sub-CBLs
   */
  SuperCBL = 0x03,

  /**
   * Extended CBL - CBL with file name and MIME type
   */
  ExtendedCBL = 0x04,

  /**
   * Message CBL - CBL for messaging system
   */
  MessageCBL = 0x05,

  /**
   * Vault CBL - CBL with vault header and entry property records
   */
  VaultCBL = 0x06,
}

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
export const BC_FEC: IBCFECConsts = {
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
  BLOCK_HEADER,
  CBL,
  OFFS_CACHE_PERCENTAGE,
  BC_FEC,
  TUPLE,
  SEALING,
  SITE,
  THEME_COLORS,
};

export const CoreOverrides = {
  Site: 'BrightChain',
  SiteTagline: 'Next-Generation Decentralized Infrastructure',
  SiteDescription:
    'The home of BrightChain, a Next-Generation Decentralized Infrastructure project.',
};

export const CoreConstants: ISuiteCoreConstants = createConstants(
  'brightchain.org',
  'brightchain.org',
  CoreOverrides,
);

export type { ISuiteCoreConstants };

export default CONSTANTS;
