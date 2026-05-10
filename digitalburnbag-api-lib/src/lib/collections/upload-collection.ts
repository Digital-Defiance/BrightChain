import type { Collection } from '@brightchain/db';
import type {
  IFileMetadataBase,
  IUploadRepository,
  IUploadSessionBase,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/** Shape of a document stored in the `burnbag_upload_escrow` collection. */
interface IEscrowDocument {
  _id: string;
  /** Base64-encoded encrypted payload. */
  ciphertext: string;
  /** UTC timestamp (ms) after which this document may be purged. */
  expiresAtMs: number;
}

export class BrightDBUploadRepository<TID extends PlatformID>
  implements IUploadRepository<TID>
{
  constructor(
    private readonly uploadSessions: Collection,
    private readonly chunkData: Collection,
    private readonly fileMetadata: Collection,
    private readonly ids: IdSerializer<TID>,
    /**
     * Optional: collection for short-lived Joule escrow payloads.
     * When not provided the escrow methods throw `ESCROW_STORE_UNAVAILABLE`.
     */
    private readonly escrowData?: Collection,
  ) {}

  async getSession(sessionId: TID): Promise<IUploadSessionBase<TID> | null> {
    const doc = await this.uploadSessions.findOne(
      filter({ _id: sessionId }, this.ids),
    );
    return doc ? this.mapSessionDoc(doc) : null;
  }

  async createSession(session: IUploadSessionBase<TID>): Promise<void> {
    const { id, receivedChunks, chunkChecksums, ...rest } = session;
    const serializedRest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      serializedRest[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.uploadSessions.insertOne({
      _id: this.ids.idToString(id as TID),
      ...serializedRest,
      receivedChunks: Array.from(receivedChunks),
      chunkChecksums: Object.fromEntries(chunkChecksums),
    });
  }

  async updateSession(session: IUploadSessionBase<TID>): Promise<void> {
    const { id, receivedChunks, chunkChecksums, ...rest } = session;
    const serializedRest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      serializedRest[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.uploadSessions.updateOne(filter({ _id: id }, this.ids), {
      $set: {
        ...serializedRest,
        receivedChunks: Array.from(receivedChunks),
        chunkChecksums: Object.fromEntries(chunkChecksums),
      },
    });
  }

  async deleteSession(sessionId: TID): Promise<void> {
    await this.uploadSessions.deleteOne(filter({ _id: sessionId }, this.ids));
  }

  async getExpiredSessions(): Promise<IUploadSessionBase<TID>[]> {
    const docs = await this.uploadSessions
      .find(filter({ expiresAt: { $lt: new Date() } }, this.ids))
      .toArray();
    return docs.map((d) => this.mapSessionDoc(d));
  }

  async storeChunkData(
    sessionId: TID,
    chunkIndex: number,
    data: Uint8Array,
  ): Promise<void> {
    const sessionIdStr = this.ids.idToString(sessionId);
    // Encode binary data as base64 so the JSON-serialized document stays
    // compact enough to fit within the block store's block size limit.
    const b64 = Buffer.from(data).toString('base64');
    await this.chunkData.insertOne({
      _id: `${sessionIdStr}_${chunkIndex}`,
      sessionId: sessionIdStr,
      chunkIndex,
      data: b64,
      encoding: 'base64',
    } as Record<string, unknown>);
  }

  async getChunkData(
    sessionId: TID,
    chunkIndex: number,
  ): Promise<Uint8Array | null> {
    const sessionIdStr = this.ids.idToString(sessionId);
    const doc = await this.chunkData.findOne(
      filter({ _id: `${sessionIdStr}_${chunkIndex}` }, this.ids),
    );
    if (!doc) return null;
    const raw = (doc as Record<string, unknown>)['data'];
    // Decode base64-encoded chunks; fall back to raw Uint8Array for
    // any legacy documents stored before the encoding change.
    if (typeof raw === 'string') {
      return new Uint8Array(Buffer.from(raw, 'base64'));
    }
    return raw as Uint8Array;
  }

  async deleteChunkData(sessionId: TID): Promise<void> {
    await this.chunkData.deleteMany(filter({ sessionId }, this.ids));
  }

  async createFileMetadata(
    metadata: IFileMetadataBase<TID>,
  ): Promise<IFileMetadataBase<TID>> {
    await this.fileMetadata.insertOne(toDoc(metadata, this.ids));
    return metadata;
  }

  async getFileMetadata(fileId: TID): Promise<IFileMetadataBase<TID> | null> {
    const doc = await this.fileMetadata.findOne(
      filter({ _id: fileId }, this.ids),
    );
    return doc ? fromDoc<TID, IFileMetadataBase<TID>>(doc, this.ids) : null;
  }

  // ---------------------------------------------------------------------------
  // Joule escrow: short-lived encrypted payload keyed by sessionId (Task 2.9)
  // ---------------------------------------------------------------------------

  async storeEscrowData(
    sessionId: string,
    ciphertext: Uint8Array,
    ttlMs: number,
  ): Promise<void> {
    if (!this.escrowData) {
      throw new Error('ESCROW_STORE_UNAVAILABLE');
    }
    const doc: IEscrowDocument = {
      _id: sessionId,
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      expiresAtMs: Date.now() + ttlMs,
    };
    // Upsert so a re-quote for the same session replaces the old escrow.
    await this.escrowData.updateOne(
      { _id: sessionId } as Parameters<Collection['updateOne']>[0],
      { $set: doc } as Parameters<Collection['updateOne']>[1],
      { upsert: true } as Parameters<Collection['updateOne']>[2],
    );
  }

  async getEscrowData(sessionId: string): Promise<Uint8Array | null> {
    if (!this.escrowData) {
      throw new Error('ESCROW_STORE_UNAVAILABLE');
    }
    const doc = (await this.escrowData.findOne({
      _id: sessionId,
    } as Parameters<Collection['findOne']>[0])) as unknown as IEscrowDocument | null;
    if (!doc) return null;
    // Treat expired docs as absent (TTL-based purge may be async).
    if (doc.expiresAtMs <= Date.now()) return null;
    return new Uint8Array(Buffer.from(doc.ciphertext, 'base64'));
  }

  async deleteEscrowData(sessionId: string): Promise<void> {
    if (!this.escrowData) {
      throw new Error('ESCROW_STORE_UNAVAILABLE');
    }
    await this.escrowData.deleteOne({
      _id: sessionId,
    } as Parameters<Collection['deleteOne']>[0]);
  }

  private mapSessionDoc(doc: unknown): IUploadSessionBase<TID> {
    const d = doc as Record<string, unknown>;
    const { _id, receivedChunks, chunkChecksums, ...rest } = d;
    // Deserialize known ID fields
    const result: Record<string, unknown> = {
      id: typeof _id === 'string' ? this.tryParseId(_id) : _id,
    };
    for (const [key, value] of Object.entries(rest)) {
      if (
        (key === 'userId' || key === 'fileId' || key === 'folderId') &&
        typeof value === 'string'
      ) {
        result[key] = this.tryParseId(value);
      } else {
        result[key] = value;
      }
    }
    result['receivedChunks'] = new Set(receivedChunks as number[]);
    result['chunkChecksums'] = new Map(
      Object.entries((chunkChecksums as Record<string, string>) ?? {}).map(
        ([k, v]) => [Number(k), v],
      ),
    );
    return result as unknown as IUploadSessionBase<TID>;
  }

  private tryParseId(value: string): TID | string {
    try {
      return this.ids.parseId(value);
    } catch {
      return value as unknown as TID;
    }
  }
}
