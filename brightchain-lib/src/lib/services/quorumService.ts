import {
  ECIESService,
  Member,
  PlatformID,
  ShortHexGuid,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumError } from '../errors/quorumError';
import {
  CanUnlockResult,
  IQuorumMember,
  IQuorumService,
  QuorumDocumentInfo,
  QuorumMemberMetadata,
  SealedDocumentResult,
} from '../interfaces/services/quorumService';
import { QuorumDataRecord } from '../quorumDataRecord';
import { SimpleStore } from '../stores/simpleStore';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

/**
 * QuorumService provides member management and document sealing/unsealing
 * functionality using Shamir's Secret Sharing for secure multi-party access control.
 *
 * This service wraps the existing BrightChainQuorum and SealingService to provide
 * a clean API for quorum operations.
 */
export class QuorumService<
  TID extends PlatformID = Uint8Array,
> implements IQuorumService<TID> {
  protected readonly sealingService: SealingService<TID>;
  protected readonly enhancedProvider: TypedIdProviderWrapper<TID>;
  protected readonly eciesService: ECIESService<TID>;

  // In-memory stores for members and documents
  // Subclasses can override with persistent storage
  protected readonly members: SimpleStore<ShortHexGuid, IQuorumMember<TID>>;
  protected readonly membersByMember: SimpleStore<ShortHexGuid, Member<TID>>;
  protected readonly documents: SimpleStore<
    ShortHexGuid,
    QuorumDataRecord<TID>
  >;

  // Track IDs for iteration (SimpleStore doesn't support iteration)
  protected readonly memberIds: Set<ShortHexGuid> = new Set();
  protected readonly documentIds: Set<ShortHexGuid> = new Set();

  constructor(
    idProvider?: TypedIdProviderWrapper<TID>,
    eciesService?: ECIESService<TID>,
  ) {
    // Use ServiceProvider to get properly configured providers if not explicitly provided
    // This ensures consistent configuration across the application
    const serviceProvider = ServiceProvider.getInstance<TID>();
    this.enhancedProvider = idProvider ?? serviceProvider.idProvider;
    this.eciesService = eciesService ?? serviceProvider.eciesService;
    this.sealingService = new SealingService<TID>(
      this.eciesService,
      this.enhancedProvider,
    );
    this.members = new SimpleStore<ShortHexGuid, IQuorumMember<TID>>();
    this.membersByMember = new SimpleStore<ShortHexGuid, Member<TID>>();
    this.documents = new SimpleStore<ShortHexGuid, QuorumDataRecord<TID>>();
  }

  /**
   * Convert a member ID to hex string format
   */
  protected memberIdToHex(memberId: TID): ShortHexGuid {
    return uint8ArrayToHex(
      this.enhancedProvider.toBytes(memberId),
    ) as ShortHexGuid;
  }

  // === Member Management ===

  async addMember(
    member: Member<TID>,
    metadata: QuorumMemberMetadata,
  ): Promise<IQuorumMember<TID>> {
    // Use member.idBytes directly instead of converting through provider
    // This ensures we get the correct bytes regardless of provider configuration
    const hexId = uint8ArrayToHex(member.idBytes) as ShortHexGuid;
    const now = new Date();

    const quorumMember: IQuorumMember<TID> = {
      id: hexId,
      publicKey: member.publicKey,
      metadata,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.members.set(hexId, quorumMember);
    this.membersByMember.set(hexId, member);
    this.memberIds.add(hexId);

    return quorumMember;
  }

  async removeMember(memberId: ShortHexGuid): Promise<void> {
    if (!this.members.has(memberId)) {
      throw new QuorumError(QuorumErrorType.MemberNotFound);
    }

    // Get the member and mark as inactive rather than deleting
    // This preserves their ability to participate in existing documents
    const member = this.members.get(memberId);
    member.isActive = false;
    member.updatedAt = new Date();
    this.members.set(memberId, member);
    // Note: We don't remove from memberIds because the member still exists
  }

  async getMember(memberId: ShortHexGuid): Promise<IQuorumMember<TID> | null> {
    if (!this.members.has(memberId)) {
      return null;
    }
    return this.members.get(memberId);
  }

  async listMembers(): Promise<IQuorumMember<TID>[]> {
    const result: IQuorumMember<TID>[] = [];
    for (const memberId of this.memberIds) {
      const member = await this.getMember(memberId);
      if (member && member.isActive) {
        result.push(member);
      }
    }
    return result;
  }

  // === Document Sealing ===

  async sealDocument<T>(
    agent: Member<TID>,
    document: T,
    memberIds: ShortHexGuid[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<TID>> {
    // Validate member count
    if (memberIds.length < 2) {
      throw new QuorumError(QuorumErrorType.NotEnoughMembers);
    }

    // Get Member objects for the specified IDs
    const members: Member<TID>[] = [];
    for (const memberId of memberIds) {
      if (!this.membersByMember.has(memberId)) {
        throw new QuorumError(QuorumErrorType.MemberNotFound);
      }
      members.push(this.membersByMember.get(memberId));
    }

    // Seal the document using the sealing service
    const sealedDoc = await this.sealingService.quorumSeal<T>(
      agent,
      document,
      members,
      sharesRequired,
    );

    // Store the sealed document
    // Use the document's own enhancedProvider to convert the ID to bytes
    const docHexId = uint8ArrayToHex(
      sealedDoc.enhancedProvider.toBytes(sealedDoc.id),
    ) as ShortHexGuid;
    this.documents.set(docHexId, sealedDoc);
    this.documentIds.add(docHexId);

    return {
      documentId: docHexId,
      encryptedData: sealedDoc.encryptedData,
      memberIds,
      sharesRequired: sealedDoc.sharesRequired,
      createdAt: sealedDoc.dateCreated,
    };
  }

  // === Document Unsealing ===

  async unsealDocument<T>(
    documentId: ShortHexGuid,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<T> {
    if (!this.documents.has(documentId)) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    const doc = this.documents.get(documentId);

    // Unseal using the sealing service
    return await this.sealingService.quorumUnseal<T>(
      doc,
      membersWithPrivateKey,
    );
  }

  // === Document Management ===

  async getDocument(
    documentId: ShortHexGuid,
  ): Promise<QuorumDocumentInfo | null> {
    if (!this.documents.has(documentId)) {
      return null;
    }

    const doc = this.documents.get(documentId);
    const creatorHexId = uint8ArrayToHex(
      this.enhancedProvider.toBytes(doc.creator.id),
    ) as ShortHexGuid;

    return {
      id: documentId,
      memberIds: doc.memberIDs.map(
        (id) =>
          uint8ArrayToHex(this.enhancedProvider.toBytes(id)) as ShortHexGuid,
      ),
      sharesRequired: doc.sharesRequired,
      createdAt: doc.dateCreated,
      creatorId: creatorHexId,
    };
  }

  async listDocuments(memberId?: ShortHexGuid): Promise<QuorumDocumentInfo[]> {
    const result: QuorumDocumentInfo[] = [];
    for (const docId of this.documentIds) {
      const doc = await this.getDocument(docId);
      if (doc) {
        // Filter by member if specified
        if (!memberId || doc.memberIds.includes(memberId)) {
          result.push(doc);
        }
      }
    }
    return result;
  }

  async deleteDocument(documentId: ShortHexGuid): Promise<void> {
    if (!this.documents.has(documentId)) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    // Remove from tracking - the document remains in SimpleStore but won't be listed
    this.documentIds.delete(documentId);
  }

  async canUnlock(
    documentId: ShortHexGuid,
    memberIds: ShortHexGuid[],
  ): Promise<CanUnlockResult> {
    if (!this.documents.has(documentId)) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    const doc = this.documents.get(documentId);
    const docMemberIds = doc.memberIDs.map(
      (id) =>
        uint8ArrayToHex(this.enhancedProvider.toBytes(id)) as ShortHexGuid,
    );

    // Find which provided members are actually in the document
    const validMemberIds = memberIds.filter((id) => docMemberIds.includes(id));
    const missingMembers = docMemberIds.filter((id) => !memberIds.includes(id));

    return {
      canUnlock: validMemberIds.length >= doc.sharesRequired,
      sharesProvided: validMemberIds.length,
      sharesRequired: doc.sharesRequired,
      missingMembers,
    };
  }
}
