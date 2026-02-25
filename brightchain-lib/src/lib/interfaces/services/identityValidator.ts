/**
 * @fileoverview IIdentityValidator interface with IdentityValidationResult.
 *
 * Validates content identity before ingestion into the block store.
 * Dispatches to real identity, alias, or anonymous validation based on creatorId.
 *
 * @see Requirements 16
 */

import { PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { IdentityValidationErrorType } from '../../enumerations/identityValidationErrorType';
import { ContentWithIdentity, IdentityMode } from '../contentWithIdentity';

/**
 * Result of content identity validation.
 */
export interface IdentityValidationResult {
  /** Whether the content identity is valid */
  valid: boolean;
  /** The detected identity mode */
  identityMode: IdentityMode;
  /** The resolved real member ID (for real/alias modes) */
  resolvedMemberId?: ShortHexGuid;
  /** Validation error type if valid is false */
  errorType?: IdentityValidationErrorType;
}

/**
 * Interface for node-side identity validation on content ingestion.
 *
 * Validates content identity before acceptance into the block store:
 * - Real identity: verifies signature matches public key, checks not banned/suspended
 * - Alias identity: verifies alias is registered and active, signature matches alias key
 * - Anonymous identity: verifies Membership_Proof is present and valid, content-bound
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IIdentityValidator<TID extends PlatformID = Uint8Array> {
  /**
   * Validate content identity before ingestion.
   * @param content - The content with identity to validate
   * @returns Validation result with identity mode and resolved member ID
   * @throws IdentityValidationError with a specific reason on failure
   */
  validateContent(
    content: ContentWithIdentity<TID>,
  ): Promise<IdentityValidationResult>;
}
