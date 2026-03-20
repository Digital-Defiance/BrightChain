/**
 * @fileoverview BrightTrustDocumentMetadata interface.
 *
 * Additional metadata fields for sealed BrightTrust documents.
 *
 * @see Requirements 1.3, 14.6
 */

import { HexString } from '@digitaldefiance/ecies-lib';

/**
 * Metadata attached to a sealed BrightTrust document.
 */
export interface BrightTrustDocumentMetadata {
  /** Epoch number at sealing time */
  epochNumber: number;
  /** True if the document was sealed in bootstrap mode */
  sealedUnderBootstrap: boolean;
  /** Link to identity recovery record if applicable */
  identityRecoveryRecordId?: HexString;
}
