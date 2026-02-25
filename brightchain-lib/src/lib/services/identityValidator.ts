/**
 * @fileoverview IdentityValidator — node-side identity validation on content ingestion.
 *
 * Validates content identity before acceptance into the block store:
 * - Real identity: verifies signature matches public key, checks not banned/suspended
 * - Alias identity: looks up alias, verifies active, verifies signature matches alias key, checks owner not banned
 * - Anonymous identity: verifies Membership_Proof present and valid, content-bound
 *
 * @see Requirements 16
 * @see Design: IdentityValidator (Section 8)
 */

import {
  ECIESService,
  PlatformID,
  ShortHexGuid,
  SignatureUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { IdentityValidationErrorType } from '../enumerations/identityValidationErrorType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { IdentityValidationError } from '../errors/identityValidationError';
import {
  ContentWithIdentity,
  IdentityMode,
} from '../interfaces/contentWithIdentity';
import {
  IIdentityValidator,
  IdentityValidationResult,
} from '../interfaces/services/identityValidator';
import { IMembershipProofService } from '../interfaces/services/membershipProof';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { ANONYMOUS_ID } from './identitySealingPipeline';

/**
 * Check if a Uint8Array matches the all-zeroes ANONYMOUS_ID.
 */
function isAnonymousId(id: Uint8Array): boolean {
  if (id.length !== ANONYMOUS_ID.length) return false;
  for (let i = 0; i < ANONYMOUS_ID.length; i++) {
    if (id[i] !== 0) return false;
  }
  return true;
}

/**
 * Compute a 32-byte hash from content fields for signature/proof verification.
 * Uses SHA3-512 truncated to 32 bytes, consistent with MembershipProofService.
 */
function computeContentDigest(
  content: ContentWithIdentity<PlatformID>,
): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${content.contentId}:${content.contentType}`);
  const fullHash = sha3_512(data);
  return fullHash.slice(0, 32);
}

/**
 * IdentityValidator validates content identity before ingestion into the block store.
 *
 * Dispatches to one of three validation paths based on the creatorId:
 * 1. Anonymous (all-zeroes GuidV4) → verify membership proof
 * 2. Alias (linked via identityRecoveryRecordId) → verify alias active + signature + owner not banned
 * 3. Real identity → verify signature + not banned/suspended
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class IdentityValidator<
  TID extends PlatformID = Uint8Array,
> implements IIdentityValidator<TID> {
  constructor(
    private readonly db: IQuorumDatabase<TID>,
    private readonly eciesService: ECIESService<TID>,
    private readonly membershipProofService: IMembershipProofService<TID>,
  ) {}

  /**
   * Validate content identity before ingestion.
   *
   * Detection logic:
   * - creatorId is all-zeroes → Anonymous mode
   * - identityRecoveryRecordId links to an alias record → Alias mode
   * - Otherwise → Real identity mode
   */
  async validateContent(
    content: ContentWithIdentity<TID>,
  ): Promise<IdentityValidationResult> {
    // Convert creatorId to bytes for anonymous check
    const creatorIdBytes = this.toBytes(content.creatorId);

    // 1. Check for anonymous identity (all-zeroes)
    if (isAnonymousId(creatorIdBytes)) {
      return this.validateAnonymous(content);
    }

    // 2. Determine identity mode from recovery record if present
    if (content.identityRecoveryRecordId) {
      const record = await this.db.getIdentityRecord(
        content.identityRecoveryRecordId,
      );
      if (
        record &&
        record.identityMode === IdentityMode.Alias &&
        record.aliasName
      ) {
        return this.validateAliasIdentity(content, record.aliasName);
      }
    }

    // 3. Default: real identity validation
    const creatorHex = uint8ArrayToHex(creatorIdBytes) as ShortHexGuid;
    return this.validateRealIdentity(content, creatorHex);
  }

  /**
   * Validate real identity content.
   *
   * 1. Look up member by creatorId
   * 2. Check member is not banned or suspended
   * 3. Verify content signature against member's public key
   */
  private async validateRealIdentity(
    content: ContentWithIdentity<TID>,
    memberId: ShortHexGuid,
  ): Promise<IdentityValidationResult> {
    const member = await this.db.getMember(memberId);

    if (!member || !member.isActive) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.InvalidSignature,
      );
    }

    // Check banned/suspended status
    this.checkMemberStatus(member.status);

    // Verify signature against member's public key
    const contentBytes = computeContentDigest(content);
    const isValid = this.eciesService.verifyMessage(
      member.publicKey,
      contentBytes,
      content.signature as SignatureUint8Array,
    );

    if (!isValid) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.InvalidSignature,
      );
    }

    return {
      valid: true,
      identityMode: IdentityMode.Real,
      resolvedMemberId: memberId,
    };
  }

  /**
   * Validate alias identity content.
   *
   * 1. Look up alias by name
   * 2. Verify alias is active
   * 3. Verify content signature against alias public key
   * 4. Check alias owner is not banned/suspended
   */
  private async validateAliasIdentity(
    content: ContentWithIdentity<TID>,
    aliasName: string,
  ): Promise<IdentityValidationResult> {
    const alias = await this.db.getAlias(aliasName);

    if (!alias) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.UnregisteredAlias,
      );
    }

    if (!alias.isActive) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.InactiveAlias,
      );
    }

    // Verify signature against alias public key
    const contentBytes = computeContentDigest(content);
    const isValid = this.eciesService.verifyMessage(
      alias.aliasPublicKey,
      contentBytes,
      content.signature as SignatureUint8Array,
    );

    if (!isValid) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.InvalidSignature,
      );
    }

    // Check alias owner is not banned/suspended
    const owner = await this.db.getMember(alias.ownerMemberId);
    if (owner) {
      this.checkMemberStatus(owner.status);
    }

    return {
      valid: true,
      identityMode: IdentityMode.Alias,
      resolvedMemberId: alias.ownerMemberId,
    };
  }

  /**
   * Validate anonymous identity content.
   *
   * 1. Verify membership proof is present
   * 2. Verify membership proof is valid against current member set
   * 3. Verify proof is content-bound (uses content hash)
   */
  private async validateAnonymous(
    content: ContentWithIdentity<TID>,
  ): Promise<IdentityValidationResult> {
    if (!content.membershipProof || content.membershipProof.length === 0) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.MissingMembershipProof,
      );
    }

    // Get all active member public keys for ring signature verification
    const activeMembers = await this.db.listActiveMembers();
    const memberPublicKeys = activeMembers.map((m) => m.publicKey);

    if (memberPublicKeys.length === 0) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.InvalidMembershipProof,
      );
    }

    // Compute content hash for proof verification (content-binding)
    const contentHash = computeContentDigest(content);

    const isValid = await this.membershipProofService.verifyProof(
      content.membershipProof,
      memberPublicKeys,
      contentHash,
    );

    if (!isValid) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.InvalidMembershipProof,
      );
    }

    return {
      valid: true,
      identityMode: IdentityMode.Anonymous,
    };
  }

  /**
   * Check member status and throw if banned or suspended.
   */
  private checkMemberStatus(status?: MemberStatusType): void {
    if (status === MemberStatusType.Banned) {
      throw new IdentityValidationError(IdentityValidationErrorType.BannedUser);
    }
    if (status === MemberStatusType.Suspended) {
      throw new IdentityValidationError(
        IdentityValidationErrorType.SuspendedUser,
      );
    }
  }

  /**
   * Convert a TID to Uint8Array bytes.
   */
  private toBytes(id: TID): Uint8Array {
    if (id instanceof Uint8Array) {
      return id;
    }
    // For string-based IDs, encode as UTF-8
    if (typeof id === 'string') {
      return new TextEncoder().encode(id);
    }
    // For other types, try to get bytes from the object
    return new Uint8Array(Buffer.from(String(id)));
  }
}
