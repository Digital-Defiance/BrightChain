import {
  SignatureUint8Array,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import { Checksum } from '../../../types/checksum';

/**
 * Interface for the binary SuperCBL header.
 *
 * SuperCBL is a hierarchical CBL that references other CBLs (sub-CBLs)
 * to handle files too large for a single CBL.
 *
 * Header format:
 * - MagicPrefix (1 byte): 0xBC
 * - BlockType (1 byte): 0x03 (SuperCBL)
 * - Version (1 byte): 0x01
 * - CRC8 (1 byte): CRC8 of header content
 * - CreatorId (16 bytes): Creator's GUID
 * - DateCreated (8 bytes): Timestamp
 * - SubCblCount (4 bytes): Number of sub-CBL references
 * - TotalBlockCount (4 bytes): Total blocks across all sub-CBLs
 * - Depth (2 bytes): Hierarchy depth
 * - OriginalDataLength (8 bytes): Original file size
 * - OriginalChecksum (64 bytes): SHA3-512 of original data
 * - CreatorSignature (64 bytes): ECDSA signature
 *
 * @see Requirements 11.1, 11.2, 11.3, 11.5
 */
export interface ISuperConstituentBlockListBlockHeader<
  TID extends PlatformID = Uint8Array,
> {
  /**
   * Creator ID of the SuperCBL
   */
  readonly creatorId: TID;

  /**
   * Date the SuperCBL was created
   */
  readonly dateCreated: Date;

  /**
   * Number of sub-CBL references in this SuperCBL
   */
  readonly subCblCount: number;

  /**
   * Total number of blocks across all sub-CBLs
   */
  readonly totalBlockCount: number;

  /**
   * Hierarchy depth (1 = direct sub-CBLs, 2+ = nested SuperCBLs)
   */
  readonly depth: number;

  /**
   * Size of the original file represented by this SuperCBL
   */
  readonly originalDataLength: number;

  /**
   * SHA3-512 checksum of the original data
   */
  readonly originalDataChecksum: Checksum;

  /**
   * Signature of the creator
   */
  readonly creatorSignature: SignatureUint8Array;

  /**
   * Sub-CBL checksums (extracted from address data section)
   */
  readonly subCblChecksums?: Checksum[];
}
