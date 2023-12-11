/**
 * @fileoverview TCBL manifest interface.
 *
 * Defines the table of contents embedded in a TCBL archive,
 * describing all contained entries and their metadata.
 *
 * @see Requirements 2.1, 2.2, 2.4, 2.5
 */

import { Checksum } from '../../types/checksum';
import { ITcblEntryDescriptor } from './tcblEntryDescriptor';

/**
 * Table of contents for a TCBL archive.
 *
 * Contains a versioned, checksummed list of entry descriptors
 * that allows consumers to enumerate and selectively extract
 * entries without reading the entire archive.
 */
export interface ITcblManifest {
  /** Manifest format version */
  version: number;
  /** Total number of entries (must equal `entries.length`) */
  entryCount: number;
  /** Ordered list of entry descriptors */
  entries: ITcblEntryDescriptor[];
  /** Checksum of the serialized manifest data for integrity verification */
  checksum: Checksum;
}
