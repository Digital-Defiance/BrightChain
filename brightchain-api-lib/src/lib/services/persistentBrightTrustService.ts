import {
  BrightTrustDataRecord,
  BrightTrustDocumentInfo,
  BrightTrustError,
  BrightTrustErrorType,
  BrightTrustMemberMetadata,
  BrightTrustService,
  CanUnlockResult,
  IBlockStore,
  IBrightTrustMember,
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
import { DefaultBackendIdType } from '../types/backend-id';

/**
 * Storage format for BrightTrust member documents
 */
interface BrightTrustMemberDocument extends DocumentRecord {
  memberId: HexString;
  publicKey: string; // hex encoded
  metadata: BrightTrustMemberMetadata;
  isActive: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * Storage format for BrightTrust document records
 */
interface BrightTrustDocumentDocument extends DocumentRecord {
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
 * BrightTrustService with persistent storage backed by any IBlockStore
 * (disk, Azure Blob, S3, or memory — determined by the application's
 * configured block store type).
 *
 * Uses BlockDocumentStore for member and document storage on top of
 * the provided IBlockStore.
 *
 * This implementation is specific to Node.js environments and uses
 * the ServiceProvider for cryptographic operations.
 */
export class PersistentBrightTrustService<
  TID extends PlatformID = DefaultBackendIdType,
> extends BrightTrustService<TID> {
  private readonly memberCollection: DocumentCollection<BrightTrustMemberDocument>;
  private readonly documentCollection: DocumentCollection<BrightTrustDocumentDocument>;
  private readonly blockStore: IBlockStore;

  constructor(blockStore: IBlockStore) {
    // Let parent class use ServiceProvider for providers
    super();

    this.blockStore = blockStore;
    const documentStore = new BlockDocumentStore(this.blockStore);

    // Get collections for members and documents
    this.memberCollection = documentStore.collection<BrightTrustMemberDocument>(
      'brightTrust-members',
    );
    this.documentCollection =
      documentStore.collection<BrightTrustDocumentDocument>(
        'brightTrust-documents',
      );
  }

  // === Member Management Overrides ===

  override async addMember(
    member: Member<TID>,
    metadata: BrightTrustMemberMetadata,
  ): Promise<IBrightTrustMember<TID>> {
    // Call parent to add to in-memory stores
    const brightTrustMember = await super.addMember(member, metadata);

    // Persist to storage
    const memberDoc: BrightTrustMemberDocument = {
      memberId: this.enhancedProvider.toString(member.id, 'hex') as HexString,
      publicKey: uint8ArrayToHex(member.publicKey),
      metadata: brightTrustMember.metadata,
      isActive: brightTrustMember.isActive,
      createdAt: brightTrustMember.createdAt.toISOString(),
      updatedAt: brightTrustMember.updatedAt.toISOString(),
    };

    await this.memberCollection.create(memberDoc);

    return brightTrustMember;
  }

  override async removeMember(memberId: TID): Promise<void> {
    // Call parent to update in-memory state
    await super.removeMember(memberId);

    // Update in storage - find and update the member document
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

  override async getMember(
    memberId: TID,
  ): Promise<IBrightTrustMember<TID> | null> {
    // First check in-memory cache
    const cached = await super.getMember(memberId);
    if (cached) {
      return cached;
    }

    // Load from storage if not in memory
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

  override async listMembers(): Promise<IBrightTrustMember<TID>[]> {
    // Load all active members from storage
    const memberDocs = await this.memberCollection
      .find({ isActive: true })
      .exec();

    if (!memberDocs) {
      return [];
    }

    return memberDocs.map((doc: BrightTrustMemberDocument) => ({
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

    // Persist to storage — store IDs as hex strings for serialization
    const docRecord: BrightTrustDocumentDocument = {
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
   * Serialize encrypted shares from BrightTrustDataRecord to storage format
   * Note: encryptedSharesByMemberId uses HexString keys (already hex strings)
   */
  private serializeShares(
    doc: BrightTrustDataRecord<TID>,
  ): Record<string, string> {
    const shares: Record<string, string> = {};
    for (const [
      memberIdHex,
      share,
    ] of doc.encryptedSharesByMemberId.entries()) {
      shares[memberIdHex] = uint8ArrayToHex(share);
    }
    return shares;
  }

  // === Document Management Overrides ===

  override async getDocument(
    documentId: TID,
  ): Promise<BrightTrustDocumentInfo<TID> | null> {
    // First check in-memory cache
    const cached = await super.getDocument(documentId);
    if (cached) {
      return cached;
    }

    // Load from storage if not in memory
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
  ): Promise<BrightTrustDocumentInfo<TID>[]> {
    // Load all documents from storage
    const allDocs = await this.documentCollection.find({}).exec();

    if (!allDocs) {
      return [];
    }

    const memberIdHex = memberId ? this.tidToHex(memberId) : undefined;
    const result: BrightTrustDocumentInfo<TID>[] = [];
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

    // Delete from storage
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

    // Load from storage
    const docRecord = await this.documentCollection
      .findOne({ documentId: documentIdHex })
      .exec();
    if (!docRecord) {
      throw new BrightTrustError(BrightTrustErrorType.DocumentNotFound);
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
   * Load a document from storage into memory for unsealing.
   * Needed because unsealDocument requires the full BrightTrustDataRecord.
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
      throw new BrightTrustError(BrightTrustErrorType.DocumentNotFound);
    }

    // Note: Full reconstruction of BrightTrustDataRecord from storage would require
    // storing additional data (like the creator Member object). For now,
    // this method serves as a placeholder for future implementation.
    // The parent class unsealDocument will throw if the document isn't in memory.
  }

  /**
   * Get the underlying block store.
   */
  getBlockStore(): IBlockStore {
    return this.blockStore;
  }
}
