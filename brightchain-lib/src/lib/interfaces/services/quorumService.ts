import {
  GuidV4Uint8Array,
  Member,
  PlatformID,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';

/**
 * Metadata for a quorum member
 */
export interface QuorumMemberMetadata {
  name: string;
  email?: string;
  role?: string;
}

/**
 * A quorum member with their public key and metadata
 * @template TID - Platform ID type (string, Uint8Array, or Buffer-based types)
 */
export interface IQuorumMember<TID extends PlatformID = GuidV4Uint8Array> {
  id: ShortHexGuid;
  publicKey: Uint8Array;
  metadata: QuorumMemberMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Reserved for future use with TID
  _platformId?: TID;
}

/**
 * A share provided by a member for unsealing
 */
export interface MemberShare {
  memberId: ShortHexGuid;
  decryptedShare: string;
}

/**
 * Result of a document sealing operation
 * @template TID - Platform ID type (string, Uint8Array, or Buffer-based types)
 */
export interface SealedDocumentResult<
  TID extends PlatformID = GuidV4Uint8Array,
> {
  documentId: ShortHexGuid;
  encryptedData: Uint8Array;
  memberIds: ShortHexGuid[];
  sharesRequired: number;
  createdAt: Date;
  // Reserved for future use with TID
  _platformId?: TID;
}

/**
 * Information about a sealed quorum document
 */
export interface QuorumDocumentInfo {
  id: ShortHexGuid;
  memberIds: ShortHexGuid[];
  sharesRequired: number;
  createdAt: Date;
  creatorId: ShortHexGuid;
}

/**
 * Result of checking if a document can be unlocked
 */
export interface CanUnlockResult {
  canUnlock: boolean;
  sharesProvided: number;
  sharesRequired: number;
  missingMembers: ShortHexGuid[];
}

/**
 * Interface for quorum service operations.
 * Provides member management and document sealing/unsealing functionality
 * using Shamir's Secret Sharing for secure multi-party access control.
 */
export interface IQuorumService<TID extends PlatformID = GuidV4Uint8Array> {
  // === Member Management ===

  /**
   * Add a new member to the quorum
   * @param member - The member to add (must have public key)
   * @param metadata - Metadata for the member
   * @returns The created quorum member record
   */
  addMember(
    member: Member<TID>,
    metadata: QuorumMemberMetadata,
  ): Promise<IQuorumMember<TID>>;

  /**
   * Remove a member from the quorum.
   * Note: This does not affect their ability to participate in unsealing
   * existing documents they are part of.
   * @param memberId - The ID of the member to remove
   */
  removeMember(memberId: ShortHexGuid): Promise<void>;

  /**
   * Get a member by their ID
   * @param memberId - The ID of the member to retrieve
   * @returns The member record, or null if not found
   */
  getMember(memberId: ShortHexGuid): Promise<IQuorumMember<TID> | null>;

  /**
   * List all active members in the quorum
   * @returns Array of all active quorum members
   */
  listMembers(): Promise<IQuorumMember<TID>[]>;

  // === Document Sealing ===

  /**
   * Seal a document so it can only be accessed when enough quorum members agree.
   * @param agent - The member performing the sealing operation
   * @param document - The document to seal
   * @param memberIds - IDs of members who will receive shares
   * @param sharesRequired - Number of shares required to unseal (defaults to all members)
   * @returns The sealed document result
   */
  sealDocument<T>(
    agent: Member<TID>,
    document: T,
    memberIds: ShortHexGuid[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<TID>>;

  // === Document Unsealing ===

  /**
   * Unseal a document using member shares.
   * @param documentId - The ID of the document to unseal
   * @param membersWithPrivateKey - Members with loaded private keys for decryption
   * @returns The unsealed document
   */
  unsealDocument<T>(
    documentId: ShortHexGuid,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<T>;

  // === Document Management ===

  /**
   * Get information about a sealed document
   * @param documentId - The ID of the document
   * @returns Document information, or null if not found
   */
  getDocument(documentId: ShortHexGuid): Promise<QuorumDocumentInfo | null>;

  /**
   * List all documents, optionally filtered by member
   * @param memberId - Optional member ID to filter by
   * @returns Array of document information
   */
  listDocuments(memberId?: ShortHexGuid): Promise<QuorumDocumentInfo[]>;

  /**
   * Delete a sealed document
   * @param documentId - The ID of the document to delete
   */
  deleteDocument(documentId: ShortHexGuid): Promise<void>;

  /**
   * Check if a set of members can unlock a document
   * @param documentId - The ID of the document
   * @param memberIds - IDs of members who would provide shares
   * @returns Result indicating if unlock is possible
   */
  canUnlock(
    documentId: ShortHexGuid,
    memberIds: ShortHexGuid[],
  ): Promise<CanUnlockResult>;
}
