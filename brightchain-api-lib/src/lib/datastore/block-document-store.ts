import {
  IBlockStore,
  IQuorumService,
  ServiceLocator,
} from '@brightchain/brightchain-lib';
import { Member, PlatformID, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { randomUUID } from 'crypto';
import {
  DocumentCollection,
  DocumentId,
  DocumentRecord,
  DocumentStore,
  QueryBuilder,
  QueryResultType,
} from './document-store';

/**
 * Options for creating a document with optional encryption
 */
export interface CreateDocumentOptions<TID extends PlatformID = Uint8Array> {
  /**
   * Whether to encrypt the document using quorum sealing
   */
  encrypt?: boolean;
  /**
   * The member performing the sealing operation (required if encrypt is true)
   */
  agent?: Member<TID>;
  /**
   * IDs of members who will receive shares (required if encrypt is true)
   */
  memberIds?: ShortHexGuid[];
  /**
   * Number of shares required to unseal (defaults to all members)
   */
  sharesRequired?: number;
}

/**
 * Options for retrieving an encrypted document
 */
export interface RetrieveDocumentOptions<TID extends PlatformID = Uint8Array> {
  /**
   * Members with loaded private keys for decryption (required for encrypted documents)
   */
  membersWithPrivateKey?: Member<TID>[];
}

/**
 * Metadata stored alongside encrypted documents
 */
interface EncryptedDocumentMetadata {
  isEncrypted: boolean;
  sealedDocumentId?: ShortHexGuid;
  memberIds?: ShortHexGuid[];
  sharesRequired?: number;
  createdAt?: string;
}

/**
 * Internal document record with encryption metadata
 */
interface InternalDocumentRecord extends DocumentRecord {
  __encryptionMetadata?: EncryptedDocumentMetadata;
}

/**
 * Simple in-memory registry for collection head pointers.
 * This maps collection names to their latest index block IDs.
 *
 * In a production system, this would be persisted to a separate
 * key-value store or database. For now, we use a static map
 * that's shared across all BlockDocumentStore instances.
 */
export class CollectionHeadRegistry {
  private static instance: CollectionHeadRegistry;
  private readonly heads = new Map<string, string>();

  private constructor() {}

  static getInstance(): CollectionHeadRegistry {
    if (!CollectionHeadRegistry.instance) {
      CollectionHeadRegistry.instance = new CollectionHeadRegistry();
    }
    return CollectionHeadRegistry.instance;
  }

  getHead(collectionKey: string): string | undefined {
    return this.heads.get(collectionKey);
  }

  setHead(collectionKey: string, indexBlockId: string): void {
    this.heads.set(collectionKey, indexBlockId);
  }

  /**
   * Generate a unique key for a collection based on store identity and collection name
   */
  static makeKey(storeId: string, collectionName: string): string {
    return `${storeId}:${collectionName}`;
  }

  /**
   * Clear all heads (useful for testing)
   */
  clear(): void {
    this.heads.clear();
  }
}

class BlockQuery<T extends QueryResultType> implements QueryBuilder<T> {
  constructor(private readonly resolveValue: () => Promise<T | null>) {}

  private self(): this {
    return this;
  }

  select(): this {
    return this.self();
  }
  populate(): this {
    return this.self();
  }
  sort(): this {
    return this.self();
  }
  limit(): this {
    return this.self();
  }
  skip(): this {
    return this.self();
  }
  lean(): this {
    return this.self();
  }
  collation(): this {
    return this.self();
  }
  session(): this {
    return this.self();
  }
  where(): this {
    return this.self();
  }
  distinct(): this {
    return this.self();
  }

  async exec(): Promise<T | null> {
    return this.resolveValue();
  }

  then<TResult1 = T | null, TResult2 = never>(
    onfulfilled?:
      | ((value: T | null) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

function matchFilter<T extends DocumentRecord>(
  doc: T,
  filter: Partial<T> = {},
): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined) return true;
    return (doc as Record<string, unknown>)[key] === value;
  });
}

function toBlockId(id: DocumentId): string {
  return typeof id === 'string' ? id : Buffer.from(id).toString('hex');
}

/**
 * Calculate a content-addressable block ID using the same algorithm as the block store.
 * This uses SHA3-512 via the ChecksumService to match how RawDataBlock computes its idChecksum.
 */
function calculateBlockId(data: Buffer | Uint8Array): string {
  const checksumService = ServiceLocator.getServiceProvider().checksumService;
  const checksum = checksumService.calculateChecksum(
    data instanceof Buffer ? new Uint8Array(data) : data,
  );
  return checksum.toHex();
}

async function encodeDoc(doc: DocumentRecord): Promise<Buffer> {
  return Buffer.from(JSON.stringify(doc), 'utf8');
}

function decodeDoc<T extends DocumentRecord>(buf: Buffer): T {
  return JSON.parse(buf.toString('utf8')) as T;
}

class BlockCollection<
  T extends DocumentRecord,
> implements DocumentCollection<T> {
  private readonly index = new Map<string, string>(); // _id -> blockId
  private readonly registryKey: string; // key for looking up index block ID in registry
  private indexLoaded = false;
  private indexLoading: Promise<void> | undefined;

  constructor(
    private readonly store: IBlockStore,
    private readonly collectionName: string,
    private readonly quorumService?: IQuorumService<PlatformID>,
    private readonly storeId: string = 'default',
  ) {
    // Registry key is used to look up the latest index block ID
    this.registryKey = CollectionHeadRegistry.makeKey(storeId, collectionName);
  }

  private async ensureIndexLoaded(): Promise<void> {
    if (this.indexLoaded) return;
    if (!this.indexLoading) {
      this.indexLoading = (async () => {
        const registry = CollectionHeadRegistry.getInstance();
        const indexBlockId = registry.getHead(this.registryKey);

        if (indexBlockId) {
          try {
            const indexBlock = await this.store.get(indexBlockId);
            const indexData = indexBlock.data as Uint8Array;
            const parsed = JSON.parse(
              Buffer.from(indexData).toString('utf8'),
            ) as {
              ids?: string[];
              mappings?: Record<string, string>;
            };
            // Support both old format (ids array) and new format (mappings object)
            if (parsed?.mappings) {
              for (const [logicalId, blockId] of Object.entries(
                parsed.mappings,
              )) {
                this.index.set(logicalId, blockId);
              }
            } else if (parsed?.ids) {
              // Legacy format: logical ID equals block ID
              for (const id of parsed.ids) {
                this.index.set(id, id);
              }
            }
          } catch {
            // Index block not found - start fresh
          }
        }
        this.indexLoaded = true;
      })().finally(() => {
        this.indexLoading = undefined;
      });
    }
    return this.indexLoading;
  }

  private async persistIndex(): Promise<void> {
    // Store the index as a mapping of logical IDs to block IDs
    const indexData: Record<string, string> = {};
    for (const [logicalId, blockId] of this.index.entries()) {
      indexData[logicalId] = blockId;
    }
    const payload = Buffer.from(
      JSON.stringify({ mappings: indexData }),
      'utf8',
    );
    if (payload.length > this.store.blockSize) {
      throw new Error(
        `Index too large for block size (${payload.length} > ${this.store.blockSize}) in ${this.collectionName}`,
      );
    }

    // Store the index under its content hash (content-addressable)
    const indexBlockId = calculateBlockId(payload);
    await this.store.put(indexBlockId, payload);

    // Update the registry with the new index block ID
    const registry = CollectionHeadRegistry.getInstance();
    registry.setHead(this.registryKey, indexBlockId);
  }

  private resolveBlockId(id?: DocumentId): string {
    return id ? toBlockId(id) : randomUUID().replace(/-/g, '');
  }

  private async writeDoc(doc: T, existingId?: string): Promise<T> {
    await this.ensureIndexLoaded();

    // Use a logical ID for the document (either existing or generated)
    const logicalId =
      existingId ?? this.resolveBlockId((doc as DocumentRecord)._id);

    // Encode the document with the logical ID
    const docWithId = { ...doc, _id: logicalId };
    const data = await encodeDoc(docWithId);
    if (data.length > this.store.blockSize) {
      throw new Error(
        `Document too large for block size (${data.length} > ${this.store.blockSize}) in ${this.collectionName}`,
      );
    }

    // Use content hash as the block ID for content-addressable storage
    const blockId = calculateBlockId(data);

    // Check if block already exists (content-addressable deduplication)
    const exists = await this.store.has(blockId);
    if (!exists) {
      await this.store.put(blockId, data);
    }

    // Map logical ID to content hash in the index
    this.index.set(logicalId, blockId);
    (doc as DocumentRecord)._id = logicalId;
    await this.persistIndex();
    return doc;
  }

  private async readDoc(logicalId: string): Promise<T | null> {
    await this.ensureIndexLoaded();
    // Get the content hash from the index
    const blockId = this.index.get(logicalId);
    if (!blockId) return null;

    try {
      const block = await this.store.get(blockId);
      const blockData = block.data as Uint8Array;
      return decodeDoc<T>(Buffer.from(blockData));
    } catch {
      // Block not found in store
      return null;
    }
  }

  private toSingleQuery(resolver: () => Promise<T | null>): QueryBuilder<T> {
    return new BlockQuery<T>(resolver) as QueryBuilder<T>;
  }

  private toManyQuery(resolver: () => Promise<T[]>): QueryBuilder<T[]> {
    return new BlockQuery<T[]>(
      resolver as () => Promise<T[] | null>,
    ) as QueryBuilder<T[]>;
  }

  find(filter?: Partial<T>): QueryBuilder<T[]> {
    return this.toManyQuery(async () => {
      await this.ensureIndexLoaded();
      const docs: T[] = [];
      for (const id of this.index.keys()) {
        const doc = await this.readDoc(id);
        if (doc && matchFilter(doc, filter)) docs.push(doc);
      }
      return docs;
    });
  }

  findOne(filter?: Partial<T>): QueryBuilder<T> {
    return this.toSingleQuery(async () => {
      await this.ensureIndexLoaded();
      for (const id of this.index.keys()) {
        const doc = await this.readDoc(id);
        if (doc && matchFilter(doc, filter)) return doc;
      }
      return null;
    });
  }

  findById(id: DocumentId): QueryBuilder<T> {
    const logicalId = toBlockId(id);
    return this.toSingleQuery(() => this.readDoc(logicalId));
  }

  /**
   * Retrieve a document by ID, decrypting if necessary
   * @param id - The document ID
   * @param options - Options for retrieving encrypted documents
   * @returns The document (decrypted if it was encrypted)
   */
  async findByIdDecrypted<TID extends PlatformID = Uint8Array>(
    id: DocumentId,
    options?: RetrieveDocumentOptions<TID>,
  ): Promise<T | null> {
    const logicalId = toBlockId(id);
    const doc = await this.readDoc(logicalId);

    if (!doc) {
      return null;
    }

    const internalDoc = doc as InternalDocumentRecord;
    if (internalDoc.__encryptionMetadata?.isEncrypted) {
      if (!this.quorumService) {
        throw new Error(
          'QuorumService is required to decrypt encrypted documents',
        );
      }
      if (
        !options?.membersWithPrivateKey ||
        options.membersWithPrivateKey.length === 0
      ) {
        throw new Error(
          'Members with private keys are required to decrypt encrypted documents',
        );
      }

      const sealedDocId = internalDoc.__encryptionMetadata.sealedDocumentId;
      if (!sealedDocId) {
        throw new Error('Encrypted document is missing sealed document ID');
      }

      // Unseal the document using QuorumService
      const unsealedDoc = await this.quorumService.unsealDocument<T>(
        sealedDocId,
        options.membersWithPrivateKey as Member<PlatformID>[],
      );

      // Return the unsealed document with the original _id
      return {
        ...unsealedDoc,
        _id: internalDoc._id,
      } as T;
    }

    return doc;
  }

  /**
   * Check if a document is encrypted
   * @param id - The document ID
   * @returns True if the document is encrypted
   */
  async isEncrypted(id: DocumentId): Promise<boolean> {
    const logicalId = toBlockId(id);
    const doc = await this.readDoc(logicalId);
    if (!doc) {
      return false;
    }
    const internalDoc = doc as InternalDocumentRecord;
    return internalDoc.__encryptionMetadata?.isEncrypted ?? false;
  }

  /**
   * Get encryption metadata for a document
   * @param id - The document ID
   * @returns The encryption metadata, or null if not encrypted
   */
  async getEncryptionMetadata(
    id: DocumentId,
  ): Promise<EncryptedDocumentMetadata | null> {
    const logicalId = toBlockId(id);
    const doc = await this.readDoc(logicalId);
    if (!doc) {
      return null;
    }
    const internalDoc = doc as InternalDocumentRecord;
    return internalDoc.__encryptionMetadata ?? null;
  }

  /**
   * Check if a member has access to a document
   * @param id - The document ID
   * @param memberId - The member ID to check access for
   * @returns True if the member has access (either unencrypted or member is in the encryption list)
   */
  async hasAccess(id: DocumentId, memberId: ShortHexGuid): Promise<boolean> {
    const logicalId = toBlockId(id);
    const doc = await this.readDoc(logicalId);
    if (!doc) {
      return false;
    }
    const internalDoc = doc as InternalDocumentRecord;

    // Unencrypted documents are accessible to everyone
    if (!internalDoc.__encryptionMetadata?.isEncrypted) {
      return true;
    }

    // For encrypted documents, check if the member is in the member list
    const memberIds = internalDoc.__encryptionMetadata.memberIds ?? [];
    return memberIds.includes(memberId);
  }

  /**
   * Find all documents accessible by a specific member
   * @param memberId - The member ID to filter by
   * @param filter - Optional additional filter criteria
   * @returns Array of documents the member has access to
   */
  async findAccessibleBy(
    memberId: ShortHexGuid,
    filter?: Partial<T>,
  ): Promise<T[]> {
    await this.ensureIndexLoaded();
    const docs: T[] = [];
    for (const id of this.index.keys()) {
      const doc = await this.readDoc(id);
      if (doc && matchFilter(doc, filter)) {
        const internalDoc = doc as InternalDocumentRecord;

        // Include unencrypted documents
        if (!internalDoc.__encryptionMetadata?.isEncrypted) {
          docs.push(doc);
          continue;
        }

        // Include encrypted documents where the member has access
        const memberIds = internalDoc.__encryptionMetadata.memberIds ?? [];
        if (memberIds.includes(memberId)) {
          docs.push(doc);
        }
      }
    }
    return docs;
  }

  /**
   * Find one document accessible by a specific member
   * @param memberId - The member ID to filter by
   * @param filter - Optional additional filter criteria
   * @returns The first document the member has access to, or null
   */
  async findOneAccessibleBy(
    memberId: ShortHexGuid,
    filter?: Partial<T>,
  ): Promise<T | null> {
    await this.ensureIndexLoaded();
    for (const id of this.index.keys()) {
      const doc = await this.readDoc(id);
      if (doc && matchFilter(doc, filter)) {
        const internalDoc = doc as InternalDocumentRecord;

        // Include unencrypted documents
        if (!internalDoc.__encryptionMetadata?.isEncrypted) {
          return doc;
        }

        // Include encrypted documents where the member has access
        const memberIds = internalDoc.__encryptionMetadata.memberIds ?? [];
        if (memberIds.includes(memberId)) {
          return doc;
        }
      }
    }
    return null;
  }

  /**
   * Count documents accessible by a specific member
   * @param memberId - The member ID to filter by
   * @param filter - Optional additional filter criteria
   * @returns The count of documents the member has access to
   */
  async countAccessibleBy(
    memberId: ShortHexGuid,
    filter?: Partial<T>,
  ): Promise<number> {
    const docs = await this.findAccessibleBy(memberId, filter);
    return docs.length;
  }

  findOneAndUpdate(filter: Partial<T>, update: Partial<T>): QueryBuilder<T> {
    return this.toSingleQuery(async () => {
      const doc = await this.findOne(filter).exec();
      if (!doc) return null;
      Object.assign(doc, update);
      await this.writeDoc(doc as T, toBlockId((doc as DocumentRecord)._id));
      return doc as T;
    });
  }

  findOneAndDelete(filter: Partial<T>): QueryBuilder<T> {
    return this.toSingleQuery(async () => {
      const doc = await this.findOne(filter).exec();
      if (!doc) return null;
      await this.deleteOne({ _id: (doc as DocumentRecord)._id } as Partial<T>);
      return doc as T;
    });
  }

  findByIdAndUpdate(id: DocumentId, update: Partial<T>): QueryBuilder<T> {
    return this.findOneAndUpdate({ _id: id } as Partial<T>, update);
  }

  findByIdAndDelete(id: DocumentId): QueryBuilder<T> {
    return this.findOneAndDelete({ _id: id } as Partial<T>);
  }

  async create(doc: T): Promise<T>;
  async create<TID extends PlatformID = Uint8Array>(
    doc: T,
    options?: CreateDocumentOptions<TID>,
  ): Promise<T>;
  async create<TID extends PlatformID = Uint8Array>(
    doc: T,
    options?: CreateDocumentOptions<TID>,
  ): Promise<T> {
    await this.ensureIndexLoaded();

    // Handle encryption if requested
    if (options?.encrypt) {
      if (!this.quorumService) {
        throw new Error('QuorumService is required for encrypted documents');
      }
      if (!options.agent) {
        throw new Error('Agent member is required for encrypted documents');
      }
      if (!options.memberIds || options.memberIds.length < 2) {
        throw new Error(
          'At least 2 member IDs are required for encrypted documents',
        );
      }

      // Seal the document using QuorumService
      const sealedResult = await this.quorumService.sealDocument(
        options.agent as Member<PlatformID>,
        doc,
        options.memberIds,
        options.sharesRequired,
      );

      // Store metadata about the encrypted document
      const internalDoc: InternalDocumentRecord = {
        ...doc,
        __encryptionMetadata: {
          isEncrypted: true,
          sealedDocumentId: sealedResult.documentId,
          memberIds: sealedResult.memberIds,
          sharesRequired: sealedResult.sharesRequired,
          createdAt: sealedResult.createdAt.toISOString(),
        },
      };

      return this.writeDoc(internalDoc as T);
    }

    return this.writeDoc({ ...(doc as DocumentRecord) } as T);
  }

  async insertMany(docs: T[]): Promise<T[]> {
    await this.ensureIndexLoaded();
    const res: T[] = [];
    for (const doc of docs) {
      res.push(await this.create(doc));
    }
    return res;
  }

  async updateOne(filter: Partial<T>, update: Partial<T>) {
    const doc = await this.findOne(filter).exec();
    if (!doc) return { modifiedCount: 0, matchedCount: 0 };
    Object.assign(doc, update);
    await this.writeDoc(doc as T, toBlockId((doc as DocumentRecord)._id));
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async updateMany(filter: Partial<T>, update: Partial<T>) {
    const docs = await this.find(filter).exec();
    let count = 0;
    if (docs) {
      for (const doc of docs) {
        Object.assign(doc, update);
        await this.writeDoc(doc as T, toBlockId((doc as DocumentRecord)._id));
        count += 1;
      }
    }
    return { modifiedCount: count, matchedCount: count };
  }

  async replaceOne(filter: Partial<T>, doc: T) {
    const existing = await this.findOne(filter).exec();
    if (!existing) return { modifiedCount: 0, matchedCount: 0 };
    await this.writeDoc(doc, toBlockId((existing as DocumentRecord)._id));
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async deleteOne(filter: Partial<T>) {
    await this.ensureIndexLoaded();
    for (const [logicalId, blockId] of this.index.entries()) {
      const doc = await this.readDoc(logicalId);
      if (doc && matchFilter(doc, filter)) {
        try {
          await this.store.delete(blockId);
        } catch {
          // Block might already be deleted or not exist
        }
        this.index.delete(logicalId);
        await this.persistIndex();
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: Partial<T>) {
    await this.ensureIndexLoaded();
    let deleted = 0;
    for (const [logicalId, blockId] of Array.from(this.index.entries())) {
      const doc = await this.readDoc(logicalId);
      if (doc && matchFilter(doc, filter)) {
        try {
          await this.store.delete(blockId);
        } catch {
          // Block might already be deleted or not exist
        }
        this.index.delete(logicalId);
        deleted += 1;
      }
    }
    if (deleted > 0) {
      await this.persistIndex();
    }
    return { deletedCount: deleted };
  }

  async countDocuments(filter?: Partial<T>) {
    const docs = await this.find(filter).exec();
    return docs ? docs.length : 0;
  }

  async estimatedDocumentCount() {
    return this.index.size;
  }

  aggregate<U = unknown>(_pipeline: unknown[]): QueryBuilder<U[]> {
    return new BlockQuery<U[]>(async () => []) as QueryBuilder<U[]>;
  }

  distinct(field: keyof T): QueryBuilder<T[keyof T][]> {
    return new BlockQuery<T[keyof T][]>(async () => {
      const values = new Set<T[keyof T]>();
      for (const id of this.index.keys()) {
        const doc = await this.readDoc(id);
        if (doc && field in doc) values.add(doc[field]);
      }
      return Array.from(values);
    }) as QueryBuilder<T[keyof T][]>;
  }

  async exists(filter: Partial<T>) {
    await this.ensureIndexLoaded();
    const doc = await this.findOne(filter).exec();
    return doc ? { _id: (doc as DocumentRecord)._id as DocumentId } : null;
  }

  watch(): void {
    /* noop */
  }

  startSession(): unknown {
    return undefined;
  }
}

export class BlockDocumentStore implements DocumentStore {
  private readonly collections = new Map<
    string,
    BlockCollection<DocumentRecord>
  >();
  private readonly storeId: string;

  constructor(
    private readonly blockStore: IBlockStore,
    private readonly quorumService?: IQuorumService<PlatformID>,
  ) {
    // Generate a unique store ID for this instance
    this.storeId = randomUUID().replace(/-/g, '');
  }

  collection<T extends DocumentRecord>(name: string): DocumentCollection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(
        name,
        new BlockCollection<DocumentRecord>(
          this.blockStore,
          name,
          this.quorumService,
          this.storeId,
        ),
      );
    }
    return this.collections.get(name) as BlockCollection<T>;
  }

  /**
   * Get a collection with encryption support
   * @param name - The collection name
   * @returns The collection with encryption methods available
   */
  encryptedCollection<T extends DocumentRecord>(
    name: string,
  ): BlockCollection<T> {
    if (!this.quorumService) {
      throw new Error('QuorumService is required for encrypted collections');
    }
    if (!this.collections.has(name)) {
      this.collections.set(
        name,
        new BlockCollection<DocumentRecord>(
          this.blockStore,
          name,
          this.quorumService,
          this.storeId,
        ),
      );
    }
    return this.collections.get(name) as BlockCollection<T>;
  }
}
