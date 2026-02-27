import {
  BlockSize,
  CanUnlockResult,
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
  HexString,
  hexToUint8Array,
  Member,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { BlockDocumentStore } from '../datastore/block-document-store';
import {
  DocumentCollection,
  DocumentRecord,
} from '../datastore/document-store';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { DefaultBackendIdType } from '../types/backend-id';

/**
 * Storage format for quorum member documents
 */
interface QuorumMemberDocument extends DocumentRecord {
  memberId: HexString;
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
  documentId: HexString;
  creatorId: HexString;
  encryptedData: string; // hex encoded
  encryptedSharesByMemberId: Record<string, string>; // memberId -> hex encoded share
  checksum: string; // hex encoded
  signature: string; // hex encoded
  memberIds: HexString[];
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
export class DiskQuorumService<
  TID extends PlatformID = DefaultBackendIdType,
> extends QuorumService<TID> {
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
    member: Member<TID>,
    metadata: QuorumMemberMetadata,
  ): Promise<IQuorumMember<TID>> {
    // Call parent to add to in-memory stores
    const quorumMember = await super.addMember(member, metadata);

    // Persist to disk
    const memberDoc: QuorumMemberDocument = {
      memberId: this.enhancedProvider.toString(member.id, 'hex') as HexString,
      publicKey: uint8ArrayToHex(member.publicKey),
      metadata: quorumMember.metadata,
      isActive: quorumMember.isActive,
      createdAt: quorumMember.createdAt.toISOString(),
      updatedAt: quorumMember.updatedAt.toISOString(),
    };

    await this.memberCollection.create(memberDoc);

    return quorumMember;
  }

  override async removeMember(memberId: TID): Promise<void> {
    // Call parent to update in-memory state
    await super.removeMember(memberId);

    // Update on disk - find and update the member document
    const memberIdHex = this.tidToHex(memberId);
    const members = await this.memberCollection
      .find({ memberId: memberIdHex })
      .exec();
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

  override async getMember(memberId: TID): Promise<IQuorumMember<TID> | null> {
    // First check in-memory cache
    const cached = await super.getMember(memberId);
    if (cached) {
      return cached;
    }

    // Load from disk if not in memory
    const memberIdHex = this.tidToHex(memberId);
    const memberDoc = await this.memberCollection
      .findOne({ memberId: memberIdHex })
      .exec();
    if (!memberDoc) {
      return null;
    }

    return {
      id: this.enhancedProvider.idFromString(memberDoc.memberId) as TID,
      publicKey: hexToUint8Array(memberDoc.publicKey),
      metadata: memberDoc.metadata,
      isActive: memberDoc.isActive,
      createdAt: new Date(memberDoc.createdAt),
      updatedAt: new Date(memberDoc.updatedAt),
    };
  }

  override async listMembers(): Promise<IQuorumMember<TID>[]> {
    // Load all active members from disk
    const memberDocs = await this.memberCollection
      .find({ isActive: true })
      .exec();

    if (!memberDocs) {
      return [];
    }

    return memberDocs.map((doc: QuorumMemberDocument) => ({
      id: this.enhancedProvider.idFromString(doc.memberId) as TID,
      publicKey: hexToUint8Array(doc.publicKey),
      metadata: doc.metadata,
      isActive: doc.isActive,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    }));
  }

  // === Document Sealing Overrides ===

  override async sealDocument<T>(
    agent: Member<TID>,
    document: T,
    memberIds: TID[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<TID>> {
    // Call parent to seal and store in memory
    const result = await super.sealDocument(
      agent,
      document,
      memberIds,
      sharesRequired,
    );

    // Get the sealed document from parent's in-memory store
    const docHexId = this.tidToHex(result.documentId);
    const sealedDoc = this.documents.get(docHexId);

    // Persist to disk — store IDs as hex strings for serialization
    const docRecord: QuorumDocumentDocument = {
      documentId: docHexId,
      creatorId: this.enhancedProvider.toString(agent.id, 'hex') as HexString,
      encryptedData: uint8ArrayToHex(sealedDoc.encryptedData),
      encryptedSharesByMemberId: this.serializeShares(sealedDoc),
      checksum: sealedDoc.checksum.toHex(),
      signature: uint8ArrayToHex(sealedDoc.signature),
      memberIds: memberIds.map((id) => this.tidToHex(id)),
      sharesRequired: result.sharesRequired,
      dateCreated: sealedDoc.dateCreated.toISOString(),
      dateUpdated: sealedDoc.dateUpdated.toISOString(),
    };

    await this.documentCollection.create(docRecord);

    return result;
  }

  /**
   * Serialize encrypted shares from QuorumDataRecord to storage format
   * Note: encryptedSharesByMemberId uses HexString keys (already hex strings)
   */
  private serializeShares(doc: QuorumDataRecord<TID>): Record<string, string> {
    const shares: Record<string, string> = {};
    for (const [
      memberIdHex,
      share,
    ] of doc.encryptedSharesByMemberId.entries()) {
      // memberIdHex is already a HexString (hex string), no conversion needed
      shares[memberIdHex] = uint8ArrayToHex(share);
    }
    return shares;
  }

  // === Document Management Overrides ===

  override async getDocument(
    documentId: TID,
  ): Promise<QuorumDocumentInfo<TID> | null> {
    // First check in-memory cache
    const cached = await super.getDocument(documentId);
    if (cached) {
      return cached;
    }

    // Load from disk if not in memory
    const documentIdHex = this.tidToHex(documentId);
    const docRecord = await this.documentCollection
      .findOne({ documentId: documentIdHex })
      .exec();
    if (!docRecord) {
      return null;
    }

    return {
      id: this.enhancedProvider.idFromString(docRecord.documentId) as TID,
      memberIds: docRecord.memberIds.map(
        (hex) => this.enhancedProvider.idFromString(hex) as TID,
      ),
      sharesRequired: docRecord.sharesRequired,
      createdAt: new Date(docRecord.dateCreated),
      creatorId: this.enhancedProvider.idFromString(docRecord.creatorId) as TID,
    };
  }

  override async listDocuments(
    memberId?: TID,
  ): Promise<QuorumDocumentInfo<TID>[]> {
    // Load all documents from disk
    const allDocs = await this.documentCollection.find({}).exec();

    if (!allDocs) {
      return [];
    }

    const memberIdHex = memberId ? this.tidToHex(memberId) : undefined;
    const result: QuorumDocumentInfo<TID>[] = [];
    for (const docRecord of allDocs) {
      // Filter by member if specified
      if (!memberIdHex || docRecord.memberIds.includes(memberIdHex)) {
        result.push({
          id: this.enhancedProvider.idFromString(docRecord.documentId) as TID,
          memberIds: docRecord.memberIds.map(
            (hex) => this.enhancedProvider.idFromString(hex) as TID,
          ),
          sharesRequired: docRecord.sharesRequired,
          createdAt: new Date(docRecord.dateCreated),
          creatorId: this.enhancedProvider.idFromString(
            docRecord.creatorId,
          ) as TID,
        });
      }
    }

    return result;
  }

  override async deleteDocument(documentId: TID): Promise<void> {
    // Call parent to remove from in-memory tracking
    await super.deleteDocument(documentId);

    // Delete from disk
    const documentIdHex = this.tidToHex(documentId);
    await this.documentCollection.deleteOne({ documentId: documentIdHex });
  }

  override async canUnlock(
    documentId: TID,
    memberIds: TID[],
  ): Promise<CanUnlockResult<TID>> {
    // First try in-memory
    const documentIdHex = this.tidToHex(documentId);
    if (this.documents.has(documentIdHex)) {
      return super.canUnlock(documentId, memberIds);
    }

    // Load from disk
    const docRecord = await this.documentCollection
      .findOne({ documentId: documentIdHex })
      .exec();
    if (!docRecord) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    const docMemberIdHexes = docRecord.memberIds;
    const memberIdHexes = memberIds.map((id) => this.tidToHex(id));

    // Find which provided members are actually in the document
    const validMemberIds = memberIds.filter((id) =>
      docMemberIdHexes.includes(this.tidToHex(id)),
    );
    const missingMembers = docMemberIdHexes
      .filter((hex) => !memberIdHexes.includes(hex))
      .map((hex) => this.enhancedProvider.idFromString(hex) as TID);

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
  async loadDocumentForUnseal(documentId: TID): Promise<void> {
    const documentIdHex = this.tidToHex(documentId);
    if (this.documents.has(documentIdHex)) {
      return; // Already in memory
    }

    const docRecord = await this.documentCollection
      .findOne({ documentId: documentIdHex })
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
