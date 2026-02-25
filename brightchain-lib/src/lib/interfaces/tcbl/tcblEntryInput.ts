/**
 * @fileoverview TCBL entry input interface.
 *
 * Defines the input format for a single entry when building a TCBL archive.
 *
 * @see Requirement 4.1
 */

/**
 * Input for a single entry when constructing a TCBL archive.
 *
 * Each entry consists of a file name, MIME type, and raw data payload.
 */
export interface ITcblEntryInput {
  /** File name for the entry */
  fileName: string;
  /** MIME type of the entry data */
  mimeType: string;
  /** Raw data payload */
  data: Uint8Array;
}
