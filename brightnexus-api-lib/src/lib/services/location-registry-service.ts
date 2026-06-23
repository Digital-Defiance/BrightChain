import type { BrightDb, Collection } from '@brightchain/db';
import {
  BrightNexusLocationCollection,
  LocationLookupSource,
  normalizeBrightSpacetimeVector,
  type IBrightNexusLocationLookupEntry,
  type IBrightNexusLocationLookupResponse,
  type IBrightNexusLocationPublishRequest,
  type IBrightNexusLocationRecord,
} from '@brightchain/brightnexus-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface ILocationRegistryIdSerializer<TID extends PlatformID> {
  idToString: (id: TID) => string;
  parseId: (idString: string) => TID;
  generateId: () => TID;
}

export class LocationRegistryService<TID extends PlatformID> {
  private readonly collection: Collection;
  private indexesEnsured = false;

  constructor(
    private readonly db: BrightDb,
    private readonly ids: ILocationRegistryIdSerializer<TID>,
  ) {
    this.collection = db.collection(BrightNexusLocationCollection);
  }

  private async ensureIndexes(): Promise<void> {
    if (this.indexesEnsured) return;
    await this.collection.createIndex(
      { memberIdHex: 1, ipAddress: 1 },
      { unique: true },
    );
    await this.collection.createIndex({ ipAddress: 1, updatedAt: -1 });
    this.indexesEnsured = true;
  }

  /**
   * Publish or update the caller's BST coordinates for an IP address.
   */
  async publish(
    memberId: TID,
    body: IBrightNexusLocationPublishRequest,
  ): Promise<IBrightNexusLocationRecord> {
    await this.ensureIndexes();
    const memberIdHex = this.ids.idToString(memberId);
    const ipAddress = body.ipAddress.trim();
    const now = new Date().toISOString();
    const vector = normalizeBrightSpacetimeVector(body.vector);

    const existing = (await this.collection.findOne({
      memberIdHex,
      ipAddress,
    })) as { _id?: string; createdAt?: string } | null;

    const doc: Omit<IBrightNexusLocationRecord, 'id'> & { _id?: string } = {
      memberId: memberIdHex,
      memberIdHex,
      ipAddress,
      vector,
      privacy: body.privacy,
      signature: body.signature,
      lookupSource: LocationLookupSource.Dht,
      updatedAt: now,
      createdAt:
        typeof existing?.createdAt === 'string' ? existing.createdAt : now,
    };

    if (existing?._id) {
      await this.collection.updateOne(
        { _id: existing._id },
        { $set: { ...doc, updatedAt: now } },
      );
      return {
        id: String(existing._id),
        ...doc,
      } as IBrightNexusLocationRecord;
    }

    const id = this.ids.idToString(this.ids.generateId());
    await this.collection.insertOne({ _id: id, ...doc });
    return { id, ...doc } as IBrightNexusLocationRecord;
  }

  /**
   * DHT-style lookup: all signed announcements for an IP (newest first).
   */
  async lookupByIp(ipAddress: string): Promise<IBrightNexusLocationLookupResponse> {
    await this.ensureIndexes();
    const ip = ipAddress.trim();
    const cursor = this.collection
      .find({ ipAddress: ip })
      .sort({ updatedAt: -1 });
    const docs = await cursor.toArray();

    const entries: IBrightNexusLocationLookupEntry[] = docs.map((doc) => ({
      memberIdHex: doc.memberIdHex as string,
      ipAddress: doc.ipAddress as string,
      vector: doc.vector as IBrightNexusLocationLookupEntry['vector'],
      privacy: doc.privacy as IBrightNexusLocationLookupEntry['privacy'],
      signature: doc.signature as string | undefined,
      signatureVerified: false,
      updatedAt: doc.updatedAt as string,
      lookupSource: LocationLookupSource.Dht,
    }));

    return { ipAddress: ip, entries };
  }

  /**
   * List all announcements published by the authenticated member.
   */
  async listByMember(memberId: TID): Promise<IBrightNexusLocationRecord[]> {
    await this.ensureIndexes();
    const memberIdHex = this.ids.idToString(memberId);
    const docs = await this.collection
      .find({ memberIdHex })
      .sort({ updatedAt: -1 })
      .toArray();

    return docs.map((doc) => ({
      id: String(doc._id),
      memberId: doc.memberIdHex as string,
      memberIdHex: doc.memberIdHex as string,
      ipAddress: doc.ipAddress as string,
      vector: doc.vector as IBrightNexusLocationRecord['vector'],
      privacy: doc.privacy as IBrightNexusLocationRecord['privacy'],
      signature:
        typeof doc.signature === 'string' ? doc.signature : '',
      lookupSource: LocationLookupSource.Dht,
      updatedAt: doc.updatedAt as string,
      createdAt: doc.createdAt as string,
    }));
  }

  /**
   * Remove the member's announcement for a specific IP.
   */
  async revoke(memberId: TID, ipAddress: string): Promise<boolean> {
    await this.ensureIndexes();
    const memberIdHex = this.ids.idToString(memberId);
    const result = await this.collection.deleteOne({
      memberIdHex,
      ipAddress: ipAddress.trim(),
    });
    return (result.deletedCount ?? 0) > 0;
  }
}
