import {
  BlockSize,
  IFecService,
  IQuorumMember,
  QuorumDataRecord,
  QuorumDocumentInfo,
  QuorumError,
  QuorumErrorType,
  QuorumMemberMetadata,
  QuorumService,
  SealedDocumentResult,
} from '@brightchain/brightchain-lib';
import {
  hexToUint8Array,
  Member,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib/src/types/guid-versions';
import { BlockDocumentStore } from '../datastore/block-document-store';
import {
  DocumentCollection,
  DocumentRecord,
} from '../datastore/document-store';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';

/**
 * Storage format for quorum member documents
 */
interface QuorumMemberDocument extends DocumentRecord {
  memberId: ShortHexGuid;
  publicKey: string; // hex encoded
  metadata: QuorumMemberMetadata;
  isActive: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * Storage format for quorum document records
 */
interface QuorumDocumentDocument extends DocumentRecord {
  documentId: ShortHexGuid;
  creatorId: ShortHexGuid;
  encryptedData: string; // hex encoded
  encryptedSharesByMemberId: Record<string, string>; // memberId -> hex encoded share
  checksum: string; // hex encoded
  signature: string; // hex encoded
  memberIds: ShortHexGuid[];
  sharesRequired: number;
  dateCreated: string; // ISO date
  dateUpdated: string; // ISO date
}

/**
 * DiskQuorumService extends QuorumService with disk-based persistence
 * using BlockDocumentStore for member and document storage.
 *
 * This implementation is specific to Node.js environments and uses
 * the ServiceProvider for cryptographic operations.
 *
 * The service can optionally be configured with an FEC service for
 * parity generation and recovery on the underlying block store.
 */
export class DiskQuorumService extends QuorumService<GuidV4Buffer> {
  private readonly memberCollection: DocumentCollection<QuorumMemberDocument>;
  private readonly documentCollection: DocumentCollection<QuorumDocumentDocument>;
  private readonly blockStore: DiskBlockAsyncStore;

  constructor(
    storagePath: string,
    blockSize: BlockSize = BlockSize.Small,
    fecService?: IFecService,
  ) {
    // Let parent class use ServiceProvider for providers
    super();

    // Initialize disk-based block store and document store
    this.blockStore = new DiskBlockAsyncStore({
      storePath: storagePath,
      blockSize,
    });

    // Set FEC service if provided
    if (fecService) {
      this.blockStore.setFecService(fecService);
    }

    const documentStore = new BlockDocumentStore(this.blockStore);

    // Get collections for members and documents
    this.memberCollection =
      documentStore.collection<QuorumMemberDocument>('quorum-members');
    this.documentCollection =
      documentStore.collection<QuorumDocumentDocument>('quorum-documents');
  }

  // === Member Management Overrides ===

  override async addMember(
    member: Member<GuidV4Buffer>,
    metadata: QuorumMemberMetadata,
  ): Promise<IQuorumMember<GuidV4Buffer>> {
    // Call parent to add to in-memory stores
    const quorumMember = await super.addMember(member, metadata);

    // Persist to disk
    const memberDoc: QuorumMemberDocument = {
      memberId: quorumMember.id,
      publicKey: uint8ArrayToHex(member.publicKey),
      metadata: quorumMember.metadata,
      isActive: quorumMember.isActive,
      createdAt: quorumMember.createdAt.toISOString(),
      updatedAt: quorumMember.updatedAt.toISOString(),
    };

    await this.memberCollection.create(memberDoc);

    return quorumMember;
  }

  override async removeMember(memberId: ShortHexGuid): Promise<void> {
    // Call parent to update in-memory state
    await super.removeMember(memberId);

    // Update on disk - find and update the member document
    const members = await this.memberCollection.find({ memberId }).exec();
    if (members && members.length > 0) {
      const memberDoc = members[0];
      memberDoc.isActive = false;
      memberDoc.updatedAt = new Date().toISOString();
      if (memberDoc._id) {
        await this.memberCollection.updateOne(
          { _id: memberDoc._id },
          memberDoc,
        );
      }
    }
  }

  override async getMember(
    memberId: ShortHexGuid,
  ): Promise<IQuorumMember<GuidV4Buffer> | null> {
    // First check in-memory cache
    const cached = await super.getMember(memberId);
    if (cached) {
      return cached;
    }

    // Load from disk if not in memory
    const memberDoc = await this.memberCollection.findOne({ memberId }).exec();
    if (!memberDoc) {
      return null;
    }

    return {
      id: memberDoc.memberId,
      publicKey: hexToUint8Array(memberDoc.publicKey),
      metadata: memberDoc.metadata,
      isActive: memberDoc.isActive,
      createdAt: new Date(memberDoc.createdAt),
      updatedAt: new Date(memberDoc.updatedAt),
    };
  }

  override async listMembers(): Promise<IQuorumMember<GuidV4Buffer>[]> {
    // Load all active members from disk
    const memberDocs = await this.memberCollection
      .find({ isActive: true })
      .exec();

    if (!memberDocs) {
      return [];
    }

    return memberDocs.map((doc: QuorumMemberDocument) => ({
      id: doc.memberId,
      publicKey: hexToUint8Array(doc.publicKey),
      metadata: doc.metadata,
      isActive: doc.isActive,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    }));
  }

  // === Document Sealing Overrides ===

  override async sealDocument<T>(
    agent: Member<GuidV4Buffer>,
    document: T,
    memberIds: ShortHexGuid[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<GuidV4Buffer>> {
    // Call parent to seal and store in memory
    const result = await super.sealDocument(
      agent,
      document,
      memberIds,
      sharesRequired,
    );

    // Get the sealed document from parent's in-memory store
    const sealedDoc = this.documents.get(result.documentId);

    // Persist to disk
    const docRecord: QuorumDocumentDocument = {
      documentId: result.documentId,
      creatorId: uint8ArrayToHex(agent.idBytes) as ShortHexGuid,
      encryptedData: uint8ArrayToHex(sealedDoc.encryptedData),
      encryptedSharesByMemberId: this.serializeShares(sealedDoc),
      checksum: sealedDoc.checksum.toHex(),
      signature: uint8ArrayToHex(sealedDoc.signature),
      memberIds: result.memberIds,
      sharesRequired: result.sharesRequired,
      dateCreated: sealedDoc.dateCreated.toISOString(),
      dateUpdated: sealedDoc.dateUpdated.toISOString(),
    };

    await this.documentCollection.create(docRecord);

    return result;
  }

  /**
   * Serialize encrypted shares from QuorumDataRecord to storage format
   * Note: encryptedSharesByMemberId uses ShortHexGuid keys (already hex strings)
   */
  private serializeShares(
    doc: QuorumDataRecord<GuidV4Buffer>,
  ): Record<string, string> {
    const shares: Record<string, string> = {};
    for (const [
      memberIdHex,
      share,
    ] of doc.encryptedSharesByMemberId.entries()) {
      // memberIdHex is already a ShortHexGuid (hex string), no conversion needed
      shares[memberIdHex] = uint8ArrayToHex(share);
    }
    return shares;
  }

  // === Document Management Overrides ===

  override async getDocument(
    documentId: ShortHexGuid,
  ): Promise<QuorumDocumentInfo | null> {
    // First check in-memory cache
    const cached = await super.getDocument(documentId);
    if (cached) {
      return cached;
    }

    // Load from disk if not in memory
    const docRecord = await this.documentCollection
      .findOne({ documentId })
      .exec();
    if (!docRecord) {
      return null;
    }

    return {
      id: docRecord.documentId,
      memberIds: docRecord.memberIds,
      sharesRequired: docRecord.sharesRequired,
      createdAt: new Date(docRecord.dateCreated),
      creatorId: docRecord.creatorId,
    };
  }

  override async listDocuments(
    memberId?: ShortHexGuid,
  ): Promise<QuorumDocumentInfo[]> {
    // Load all documents from disk
    const allDocs = await this.documentCollection.find({}).exec();

    if (!allDocs) {
      return [];
    }

    const result: QuorumDocumentInfo[] = [];
    for (const docRecord of allDocs) {
      // Filter by member if specified
      if (!memberId || docRecord.memberIds.includes(memberId)) {
        result.push({
          id: docRecord.documentId,
          memberIds: docRecord.memberIds,
          sharesRequired: docRecord.sharesRequired,
          createdAt: new Date(docRecord.dateCreated),
          creatorId: docRecord.creatorId,
        });
      }
    }

    return result;
  }

  override async deleteDocument(documentId: ShortHexGuid): Promise<void> {
    // Call parent to remove from in-memory tracking
    await super.deleteDocument(documentId);

    // Delete from disk
    await this.documentCollection.deleteOne({ documentId });
  }

  override async canUnlock(
    documentId: ShortHexGuid,
    memberIds: ShortHexGuid[],
  ): Promise<{
    canUnlock: boolean;
    sharesProvided: number;
    sharesRequired: number;
    missingMembers: ShortHexGuid[];
  }> {
    // First try in-memory
    if (this.documents.has(documentId)) {
      return super.canUnlock(documentId, memberIds);
    }

    // Load from disk
    const docRecord = await this.documentCollection
      .findOne({ documentId })
      .exec();
    if (!docRecord) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    const docMemberIds = docRecord.memberIds;

    // Find which provided members are actually in the document
    const validMemberIds = memberIds.filter((id: ShortHexGuid) =>
      docMemberIds.includes(id),
    );
    const missingMembers = docMemberIds.filter(
      (id: ShortHexGuid) => !memberIds.includes(id),
    );

    return {
      canUnlock: validMemberIds.length >= docRecord.sharesRequired,
      sharesProvided: validMemberIds.length,
      sharesRequired: docRecord.sharesRequired,
      missingMembers,
    };
  }

  /**
   * Load a document from disk into memory for unsealing
   * This is needed because unsealDocument requires the full QuorumDataRecord
   */
  async loadDocumentForUnseal(documentId: ShortHexGuid): Promise<void> {
    if (this.documents.has(documentId)) {
      return; // Already in memory
    }

    const docRecord = await this.documentCollection
      .findOne({ documentId })
      .exec();
    if (!docRecord) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    // Note: Full reconstruction of QuorumDataRecord from disk would require
    // storing additional data (like the creator Member object). For now,
    // this method serves as a placeholder for future implementation.
    // The parent class unsealDocument will throw if the document isn't in memory.
  }

  /**
   * Set the FEC service for parity generation and recovery.
   * This can be called after construction to enable FEC support.
   * @param fecService - The FEC service to use
   */
  setFecService(fecService: IFecService | null): void {
    this.blockStore.setFecService(fecService);
  }

  /**
   * Get the underlying block store.
   * Useful for advanced operations or testing.
   */
  getBlockStore(): DiskBlockAsyncStore {
    return this.blockStore;
  }
}
