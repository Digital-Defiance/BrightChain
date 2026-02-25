/**
 * @fileoverview QuorumDocumentMetadata interface.
 *
 * Additional metadata fields for sealed quorum documents.
 *
 * @see Requirements 1.3, 14.6
 */

import { ShortHexGuid } from '@digitaldefiance/ecies-lib';

/**
 * Metadata attached to a sealed quorum document.
 */
export interface QuorumDocumentMetadata {
  /** Epoch number at sealing time */
  epochNumber: number;
  /** True if the document was sealed in bootstrap mode */
  sealedUnderBootstrap: boolean;
  /** Link to identity recovery record if applicable */
  identityRecoveryRecordId?: ShortHexGuid;
}
