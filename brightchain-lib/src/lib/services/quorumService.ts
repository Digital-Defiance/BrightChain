import {
  ECIESService,
  HexString,
  Member,
  PlatformID,
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
  protected readonly members: SimpleStore<HexString, IQuorumMember<TID>>;
  protected readonly membersByMember: SimpleStore<HexString, Member<TID>>;
  protected readonly documents: SimpleStore<HexString, QuorumDataRecord<TID>>;

  // Track IDs for iteration (SimpleStore doesn't support iteration)
  protected readonly memberIds: Set<HexString> = new Set();
  protected readonly documentIds: Set<HexString> = new Set();

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
    this.members = new SimpleStore<HexString, IQuorumMember<TID>>();
    this.membersByMember = new SimpleStore<HexString, Member<TID>>();
    this.documents = new SimpleStore<HexString, QuorumDataRecord<TID>>();
  }

  /**
   * Convert a TID to hex string format for internal storage keys
   */
  protected tidToHex(id: TID): HexString {
    return this.enhancedProvider.toString(id, 'hex') as HexString;
  }

  // === Member Management ===

  async addMember(
    member: Member<TID>,
    metadata: QuorumMemberMetadata,
  ): Promise<IQuorumMember<TID>> {
    // Use member.idBytes directly instead of converting through provider
    // This ensures we get the correct bytes regardless of provider configuration
    const hexId = uint8ArrayToHex(member.idBytes) as HexString;
    const now = new Date();

    const quorumMember: IQuorumMember<TID> = {
      id: member.id,
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

  async removeMember(memberId: TID): Promise<void> {
    const hexId = this.tidToHex(memberId);
    if (!this.members.has(hexId)) {
      throw new QuorumError(QuorumErrorType.MemberNotFound);
    }

    // Get the member and mark as inactive rather than deleting
    // This preserves their ability to participate in existing documents
    const member = this.members.get(hexId);
    member.isActive = false;
    member.updatedAt = new Date();
    this.members.set(hexId, member);
    // Note: We don't remove from memberIds because the member still exists
  }

  async getMember(memberId: TID): Promise<IQuorumMember<TID> | null> {
    const hexId = this.tidToHex(memberId);
    if (!this.members.has(hexId)) {
      return null;
    }
    return this.members.get(hexId);
  }

  async listMembers(): Promise<IQuorumMember<TID>[]> {
    const result: IQuorumMember<TID>[] = [];
    for (const hexId of this.memberIds) {
      if (this.members.has(hexId)) {
        const member = this.members.get(hexId);
        if (member && member.isActive) {
          result.push(member);
        }
      }
    }
    return result;
  }

  // === Document Sealing ===

  async sealDocument<T>(
    agent: Member<TID>,
    document: T,
    memberIds: TID[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<TID>> {
    // Validate member count
    if (memberIds.length < 2) {
      throw new QuorumError(QuorumErrorType.NotEnoughMembers);
    }

    // Get Member objects for the specified IDs
    const members: Member<TID>[] = [];
    for (const memberId of memberIds) {
      const hexId = this.tidToHex(memberId);
      if (!this.membersByMember.has(hexId)) {
        throw new QuorumError(QuorumErrorType.MemberNotFound);
      }
      members.push(this.membersByMember.get(hexId));
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
    const docHexId = this.enhancedProvider.toString(
      sealedDoc.id,
      'hex',
    ) as HexString;
    this.documents.set(docHexId, sealedDoc);
    this.documentIds.add(docHexId);

    return {
      documentId: sealedDoc.id,
      encryptedData: sealedDoc.encryptedData,
      memberIds,
      sharesRequired: sealedDoc.sharesRequired,
      createdAt: sealedDoc.dateCreated,
    };
  }

  // === Document Unsealing ===

  async unsealDocument<T>(
    documentId: TID,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<T> {
    const hexId = this.tidToHex(documentId);
    if (!this.documents.has(hexId)) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    const doc = this.documents.get(hexId);

    // Unseal using the sealing service
    return await this.sealingService.quorumUnseal<T>(
      doc,
      membersWithPrivateKey,
    );
  }

  // === Document Management ===

  async getDocument(documentId: TID): Promise<QuorumDocumentInfo<TID> | null> {
    const hexId = this.tidToHex(documentId);
    if (!this.documents.has(hexId)) {
      return null;
    }

    const doc = this.documents.get(hexId);

    return {
      id: doc.id,
      memberIds: doc.memberIDs,
      sharesRequired: doc.sharesRequired,
      createdAt: doc.dateCreated,
      creatorId: doc.creator.id,
    };
  }

  async listDocuments(memberId?: TID): Promise<QuorumDocumentInfo<TID>[]> {
    const result: QuorumDocumentInfo<TID>[] = [];
    const memberHexId = memberId ? this.tidToHex(memberId) : undefined;
    for (const docHexId of this.documentIds) {
      if (this.documents.has(docHexId)) {
        const doc = this.documents.get(docHexId);
        // Filter by member if specified
        if (!memberHexId) {
          result.push({
            id: doc.id,
            memberIds: doc.memberIDs,
            sharesRequired: doc.sharesRequired,
            createdAt: doc.dateCreated,
            creatorId: doc.creator.id,
          });
        } else {
          const docMemberHexIds = doc.memberIDs.map(
            (id) => this.enhancedProvider.toString(id, 'hex') as HexString,
          );
          if (docMemberHexIds.includes(memberHexId)) {
            result.push({
              id: doc.id,
              memberIds: doc.memberIDs,
              sharesRequired: doc.sharesRequired,
              createdAt: doc.dateCreated,
              creatorId: doc.creator.id,
            });
          }
        }
      }
    }
    return result;
  }

  async deleteDocument(documentId: TID): Promise<void> {
    const hexId = this.tidToHex(documentId);
    if (!this.documents.has(hexId)) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    // Remove from tracking - the document remains in SimpleStore but won't be listed
    this.documentIds.delete(hexId);
  }

  async canUnlock(
    documentId: TID,
    memberIds: TID[],
  ): Promise<CanUnlockResult<TID>> {
    const hexId = this.tidToHex(documentId);
    if (!this.documents.has(hexId)) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    const doc = this.documents.get(hexId);
    const docMemberHexIds = doc.memberIDs.map(
      (id) => this.enhancedProvider.toString(id, 'hex') as HexString,
    );

    // Convert provided memberIds to hex for comparison
    const providedHexIds = memberIds.map((id) => this.tidToHex(id));

    // Find which provided members are actually in the document
    const validCount = providedHexIds.filter((id) =>
      docMemberHexIds.includes(id),
    ).length;

    // Find missing members (doc members not in provided list)
    const missingMembers = doc.memberIDs.filter((id) => {
      const hex = this.enhancedProvider.toString(id, 'hex') as HexString;
      return !providedHexIds.includes(hex);
    });

    return {
      canUnlock: validCount >= doc.sharesRequired,
      sharesProvided: validCount,
      sharesRequired: doc.sharesRequired,
      missingMembers,
    };
  }
}
