/**
 * CBL type discriminator for version 2 CBLs
 */
export type CBLType = 'regular' | 'super-cbl' | 'sub-cbl';

/**
 * Legacy CBL format (version 1) for backward compatibility
 */
export interface CBLv1 {
  version: 1;
  fileName: string;
  originalSize: number;
  blockSize: number;
  blockCount: number;
  blocks: string[];
}

/**
 * Regular CBL format (version 2) - contains direct block references
 */
export interface RegularCBLv2 {
  version: 2;
  type: 'regular';
  fileName: string;
  originalSize: number;
  blockSize: number;
  blockCount: number;
  blocks: string[];
}

/**
 * Sub-CBL format - child CBL referenced by a Super CBL
 */
export interface SubCBL {
  version: 2;
  type: 'sub-cbl';
  fileName: string;
  originalSize: number;
  blockSize: number;
  blockCount: number;
  blocks: string[];
  subCblIndex: number;
  totalSubCbls: number;
}

/**
 * Super CBL format - parent CBL that references sub-CBLs via magnet URLs
 */
export interface SuperCBL {
  version: 2;
  type: 'super-cbl';
  fileName: string;
  originalSize: number;
  blockSize: number;
  totalBlockCount: number;
  depth: number;
  subCblCount: number;
  subCblMagnetUrls: string[];
}

/**
 * Union type for all CBL formats
 */
export type CBLData = CBLv1 | RegularCBLv2 | SubCBL | SuperCBL;

/**
 * Result of creating a Super CBL hierarchy
 */
export interface SuperCBLCreationResult {
  /**
   * The root CBL (either RegularCBLv2 or SuperCBL)
   */
  rootCbl: RegularCBLv2 | SuperCBL;

  /**
   * All sub-CBLs created (empty for regular CBLs)
   */
  subCbls: SubCBL[];

  /**
   * Hierarchy depth (1 for regular CBL, 2+ for Super CBL)
   */
  depth: number;

  /**
   * Whether a Super CBL was required
   */
  isSuperCbl: boolean;
}

/**
 * Configuration for Super CBL creation
 */
export interface SuperCBLConfig {
  /**
   * Target block size in bytes
   */
  blockSize: number;

  /**
   * Maximum hierarchy depth (default: 10)
   */
  maxDepth?: number;

  /**
   * File name for metadata
   */
  fileName: string;

  /**
   * Original file size in bytes
   */
  originalSize: number;
}
