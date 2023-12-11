/**
 * @fileoverview TCBL entry descriptor interface.
 *
 * Describes a single file/data entry within a TCBL archive manifest.
 *
 * @see Requirement 2.3
 */

import { Checksum } from '../../types/checksum';

/**
 * Describes a single entry within a TCBL archive manifest.
 *
 * Each entry records the metadata needed to identify and retrieve
 * one file or data item bundled in the archive.
 */
export interface ITcblEntryDescriptor {
  /** Original file name of the entry */
  fileName: string;
  /** MIME type of the entry data */
  mimeType: string;
  /** Original uncompressed data length in bytes */
  originalDataLength: number;
  /** CBL address referencing the entry data in the block store */
  cblAddress: Checksum;
}
