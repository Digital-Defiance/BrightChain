/**
 * @fileoverview IContentIngestionService interface.
 *
 * Defines the contract for content ingestion middleware that validates
 * identity and seals identity shards before accepting content into the block store.
 *
 * @see Requirements 16
 * @see Design: Content Ingestion Pipeline Integration (Task 19)
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { IdentityValidationErrorType } from '../../enumerations/identityValidationErrorType';
import { ContentWithIdentity, IdentityMode } from '../contentWithIdentity';

/**
 * Result of content ingestion processing.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface ContentIngestionResult<TID extends PlatformID = Uint8Array> {
  /** Whether the content was accepted */
  accepted: boolean;
  /** The content with identity replaced (after sealing) */
  processedContent: ContentWithIdentity<TID>;
  /** The identity recovery record ID (from sealing pipeline) */
  recoveryRecordId: ShortHexGuid;
  /** The detected identity mode */
  identityMode: IdentityMode;
  /** The resolved real member ID (for real/alias modes) */
  resolvedMemberId?: ShortHexGuid;
}

/**
 * Rejection result when content ingestion fails.
 */
export interface ContentIngestionRejection {
  /** Whether the content was accepted (always false) */
  accepted: false;
  /** The reason for rejection */
  reason: string;
  /** The specific error type for programmatic handling */
  errorType: IdentityValidationErrorType | 'IDENTITY_SEALING_FAILED';
}

/**
 * Interface for content ingestion middleware.
 *
 * Orchestrates the identity validation and sealing pipeline:
 * 1. Validates content identity via IIdentityValidator
 * 2. Seals identity via IIdentitySealingPipeline (generates shards, replaces identity)
 * 3. Returns processed content ready for block store acceptance
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IContentIngestionService<TID extends PlatformID = Uint8Array> {
  /**
   * Process content through identity validation and sealing before block store acceptance.
   *
   * @param content - The content with identity to validate and seal
   * @returns Ingestion result with processed content and recovery record ID
   * @throws IdentityValidationError if identity validation fails
   * @throws QuorumError if identity sealing fails
   */
  processContent(
    content: ContentWithIdentity<TID>,
  ): Promise<ContentIngestionResult<TID>>;
}
