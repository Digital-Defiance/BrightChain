/**
 * @fileoverview ContentIngestionService — wires identity validation and sealing
 * into the content ingestion path.
 *
 * Before content is accepted into the block store, this service:
 * 1. Validates the content identity via IdentityValidator
 * 2. Seals the identity via IdentitySealingPipeline (generates shards, replaces identity)
 * 3. Returns the processed content ready for block store acceptance
 *
 * @see Requirements 16
 * @see Design: Content Ingestion Pipeline Integration (Task 19)
 */

import {
  ContentIngestionRejection,
  ContentIngestionResult,
  ContentWithIdentity,
  IContentIngestionService,
  IdentityMode,
  IdentityValidationError,
  IdentityValidationErrorType,
  IIdentitySealingPipeline,
  IIdentityValidator,
  QuorumError,
  QuorumErrorType,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Human-readable error messages for each IdentityValidationErrorType.
 */
const VALIDATION_ERROR_MESSAGES: Record<IdentityValidationErrorType, string> = {
  [IdentityValidationErrorType.InvalidSignature]:
    'Content signature does not match the claimed identity public key',
  [IdentityValidationErrorType.UnregisteredAlias]:
    'The alias used for content publication is not registered',
  [IdentityValidationErrorType.InactiveAlias]:
    'The alias used for content publication has been deactivated',
  [IdentityValidationErrorType.InvalidMembershipProof]:
    'The membership proof for anonymous content is invalid',
  [IdentityValidationErrorType.MissingMembershipProof]:
    'Anonymous content must include a valid membership proof',
  [IdentityValidationErrorType.BannedUser]:
    'The content creator has been banned from the network',
  [IdentityValidationErrorType.SuspendedUser]:
    'The content creator is currently suspended',
  [IdentityValidationErrorType.ShardVerificationFailed]:
    'Identity shard verification failed during sealing',
};

/**
 * ContentIngestionService orchestrates identity validation and sealing
 * before content is accepted into the block store.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class ContentIngestionService<
  TID extends PlatformID = Uint8Array,
> implements IContentIngestionService<TID> {
  constructor(
    private readonly identityValidator: IIdentityValidator<TID>,
    private readonly identitySealingPipeline: IIdentitySealingPipeline<TID>,
  ) {}

  /**
   * Process content through identity validation and sealing.
   *
   * Steps:
   * 1. Validate identity (signature, alias status, membership proof, ban/suspend check)
   * 2. Seal identity (generate shards, replace identity field, distribute encrypted shards)
   * 3. Return processed content with recovery record ID
   *
   * @param content - The content with identity to validate and seal
   * @returns Ingestion result with processed content
   * @throws IdentityValidationError with specific error type on validation failure
   * @throws QuorumError with IdentitySealingFailed on sealing failure
   */
  async processContent(
    content: ContentWithIdentity<TID>,
  ): Promise<ContentIngestionResult<TID>> {
    // Step 1: Validate identity
    const validationResult =
      await this.identityValidator.validateContent(content);

    // Step 2: Determine alias name for alias mode
    let aliasName: string | undefined;
    if (validationResult.identityMode === IdentityMode.Alias) {
      aliasName = await this.resolveAliasName(content);
    }

    // Step 3: Seal identity through the pipeline
    const sealingResult = await this.identitySealingPipeline.sealIdentity(
      content,
      validationResult.identityMode,
      aliasName,
    );

    return {
      accepted: true,
      processedContent: sealingResult.modifiedContent,
      recoveryRecordId: sealingResult.recoveryRecordId,
      identityMode: validationResult.identityMode,
      resolvedMemberId: validationResult.resolvedMemberId,
    };
  }

  /**
   * Resolve the alias name from content's identity recovery record.
   * The IdentityValidator already confirmed the alias exists and is active,
   * so the sealing pipeline handles alias lookup internally.
   */
  private async resolveAliasName(
    _content: ContentWithIdentity<TID>,
  ): Promise<string | undefined> {
    // The alias name is determined by the IdentitySealingPipeline
    // based on the content's identityRecoveryRecordId.
    // The sealing pipeline handles alias lookup internally.
    return undefined;
  }

  /**
   * Create a rejection result from an IdentityValidationError.
   *
   * @param error - The validation error
   * @returns A structured rejection result
   */
  static createRejection(
    error: IdentityValidationError,
  ): ContentIngestionRejection {
    const errorType = error.type as IdentityValidationErrorType;
    return {
      accepted: false,
      reason:
        VALIDATION_ERROR_MESSAGES[errorType] ??
        `Identity validation failed: ${errorType}`,
      errorType,
    };
  }

  /**
   * Create a rejection result from a QuorumError (sealing failure).
   *
   * @param error - The quorum error
   * @returns A structured rejection result
   */
  static createSealingRejection(error: QuorumError): ContentIngestionRejection {
    const errorType = error.type as QuorumErrorType;
    let reason: string;

    switch (errorType) {
      case QuorumErrorType.IdentitySealingFailed:
        reason =
          'Identity sealing failed during shard generation or distribution';
        break;
      case QuorumErrorType.ShardVerificationFailed:
        reason =
          'Identity shard verification failed — shards do not reconstruct correctly';
        break;
      default:
        reason = `Identity sealing failed: ${errorType}`;
    }

    return {
      accepted: false,
      reason,
      errorType: 'IDENTITY_SEALING_FAILED',
    };
  }

  /**
   * Determine if an error is an IdentityValidationError.
   */
  static isValidationError(error: unknown): error is IdentityValidationError {
    return error instanceof IdentityValidationError;
  }

  /**
   * Determine if an error is a QuorumError.
   */
  static isQuorumError(error: unknown): error is QuorumError {
    return error instanceof QuorumError;
  }
}
