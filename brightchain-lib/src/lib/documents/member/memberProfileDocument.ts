import {
  Member,
  PlatformID,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { FactoryPatternViolationError } from '../../errors/factoryPatternViolationError';
import { MemberError } from '../../errors/memberError';
import { BlockStoreFactory } from '../../factories/blockStoreFactory';
import {
  IPrivateMemberProfileHydratedData,
  IPrivateMemberProfileStorageData,
  IPublicMemberProfileHydratedData,
  IPublicMemberProfileStorageData,
} from '../../interfaces/member/profileStorage';
import { MemberCblService } from '../../services/member/memberCblService';
import { ServiceProvider } from '../../services/service.provider';
import { Checksum } from '../../types/checksum';
import { Document } from '../base';
import {
  privateMemberProfileHydrationSchema,
  publicMemberProfileHydrationSchema,
} from './memberProfileHydration';

/**
 * Private symbol used to verify factory method usage.
 * @internal
 */
const FACTORY_TOKEN = Symbol('MemberProfileDocument.factory-token');

/**
 * Document for storing member operational/profile data.
 *
 * This is separate from MemberDocument which handles identity/authentication data.
 * MemberProfileDocument stores:
 * - Network status (status, lastSeen, reputation)
 * - Storage metrics (storageContributed, storageUsed)
 * - Geographic info (region, geographicSpread)
 * - Private settings (trustedPeers, blockedPeers, settings, activityLog)
 *
 * @remarks
 * Uses factory pattern - instantiate via MemberProfileDocument.create()
 *
 * @example
 * ```typescript
 * const profileDoc = MemberProfileDocument.create(
 *   member,
 *   publicProfileData,
 *   privateProfileData,
 *   { blockSize: BlockSize.Small }
 * );
 * ```
 */
export class MemberProfileDocument<TID extends PlatformID = Uint8Array> {
  private readonly publicDocument: Document<IPublicMemberProfileStorageData>;
  private readonly privateDocument: Document<IPrivateMemberProfileStorageData>;
  private readonly creator: Member<TID>;
  private readonly _blockSize: BlockSize;
  private cblService: MemberCblService<TID>;

  private publicCBLId?: Checksum;
  private privateCBLId?: Checksum;

  /**
   * Private constructor - use create() factory method
   * @internal
   */
  constructor(
    factoryToken: symbol,
    creator: Member<TID>,
    publicData: IPublicMemberProfileStorageData,
    privateData: IPrivateMemberProfileStorageData,
    publicCBLId?: Checksum,
    privateCBLId?: Checksum,
    config?: { blockSize?: BlockSize },
  ) {
    if (factoryToken !== FACTORY_TOKEN) {
      throw new FactoryPatternViolationError('MemberProfileDocument', {
        hint: 'Use MemberProfileDocument.create() instead of new MemberProfileDocument()',
      });
    }

    this.creator = creator;
    this.publicDocument = new Document<IPublicMemberProfileStorageData>(
      publicData,
    );
    this.privateDocument = new Document<IPrivateMemberProfileStorageData>(
      privateData,
    );
    this.publicCBLId = publicCBLId;
    this.privateCBLId = privateCBLId;
    this._blockSize = config?.blockSize ?? BlockSize.Small;

    const blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: this._blockSize,
    });
    this.cblService = new MemberCblService(blockStore);
  }

  public static create<TID extends PlatformID = Uint8Array>(
    creator: Member<TID>,
    publicData: IPublicMemberProfileHydratedData<TID>,
    privateData: IPrivateMemberProfileHydratedData<TID>,
    config?: { blockSize?: BlockSize },
  ): MemberProfileDocument<TID>;

  public static create<TID extends PlatformID = Uint8Array>(
    _id: TID,
    creator: Member<TID>,
    publicData: IPublicMemberProfileHydratedData<TID>,
    privateData: IPrivateMemberProfileHydratedData<TID>,
    config?: { blockSize?: BlockSize },
  ): MemberProfileDocument<TID>;

  public static create<TID extends PlatformID = Uint8Array>(
    arg1: Member<TID> | TID,
    arg2:
      | Member<TID>
      | IPublicMemberProfileHydratedData<TID>,
    arg3?: IPublicMemberProfileHydratedData<TID> | IPrivateMemberProfileHydratedData<TID>,
    arg4?: IPrivateMemberProfileHydratedData<TID> | { blockSize?: BlockSize },
    arg5?: { blockSize?: BlockSize },
  ): MemberProfileDocument<TID> {
    let creator: Member<TID>;
    let publicData: IPublicMemberProfileHydratedData<TID>;
    let privateData: IPrivateMemberProfileHydratedData<TID>;
    let config: { blockSize?: BlockSize } | undefined;

    if (arg2 instanceof Member) {
      creator = arg2;
      publicData = arg3 as IPublicMemberProfileHydratedData<TID>;
      privateData = arg4 as IPrivateMemberProfileHydratedData<TID>;
      config = arg5 as { blockSize?: BlockSize } | undefined;
    } else if (arg1 instanceof Member) {
      creator = arg1;
      publicData = arg2 as IPublicMemberProfileHydratedData<TID>;
      privateData = arg3 as IPrivateMemberProfileHydratedData<TID>;
      config = arg4 as { blockSize?: BlockSize } | undefined;
    } else {
      throw new MemberError(MemberErrorType.InvalidMemberData);
    }

    if (!creator?.id) {
      throw new MemberError(MemberErrorType.InvalidMemberData);
    }

    const publicSchema = publicMemberProfileHydrationSchema<TID>();
    const privateSchema = privateMemberProfileHydrationSchema<TID>();

    const publicStorageData = publicSchema.dehydrate(publicData);
    const privateStorageData = privateSchema.dehydrate(privateData);

    return new MemberProfileDocument<TID>(
      FACTORY_TOKEN,
      creator,
      publicStorageData,
      privateStorageData,
      undefined,
      undefined,
      config,
    );
  }

  /**
   * Get the document ID (member's ID in hex format)
   */
  public get id(): string {
    return uint8ArrayToHex(this.creator.idBytes);
  }

  /**
   * Get public profile data (storage format)
   */
  public get publicData(): IPublicMemberProfileStorageData {
    return this.publicDocument.getData();
  }

  /**
   * Get private profile data (storage format)
   */
  public get privateData(): IPrivateMemberProfileStorageData {
    return this.privateDocument.getData();
  }

  /**
   * Get public profile data (hydrated format)
   */
  public getPublicHydrated(): IPublicMemberProfileHydratedData<TID> {
    const schema = publicMemberProfileHydrationSchema<TID>();
    return schema.hydrate(this.publicData);
  }

  /**
   * Get private profile data (hydrated format)
   */
  public getPrivateHydrated(): IPrivateMemberProfileHydratedData<TID> {
    const schema = privateMemberProfileHydrationSchema<TID>();
    return schema.hydrate(this.privateData);
  }

  /**
   * Convert public data to JSON
   */
  public toPublicJson(): string {
    return this.publicDocument.toJson();
  }

  /**
   * Convert private data to JSON
   */
  public toPrivateJson(): string {
    return this.privateDocument.toJson();
  }

  /**
   * Get block size
   */
  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * Get public CBL checksum
   */
  public getPublicCBL(): Checksum {
    if (!this.publicCBLId) {
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
    return this.publicCBLId;
  }

  /**
   * Get private CBL checksum
   */
  public getPrivateCBL(): Checksum {
    if (!this.privateCBLId) {
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
    return this.privateCBLId;
  }

  /**   * Get date created (from public storage data)
   */
  public get dateCreated(): Date {
    return new Date(this.publicData.dateCreated);
  }

  /**   * Generate CBLs for both public and private profile data
   */
  public async generateCBLs(): Promise<void> {
    const _publicCBLData = await this.toPublicCBLData();
    const _privateCBLData = await this.toPrivateCBLData();

    // The checksums are set inside toPublicCBLData/toPrivateCBLData
    if (!this.publicCBLId || !this.privateCBLId) {
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  public async toPublicCBL(): Promise<Uint8Array> {
    if (!this.publicCBLId) {
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
    return new TextEncoder().encode(this.toPublicJson());
  }

  public async toPrivateCBL(): Promise<Uint8Array> {
    if (!this.privateCBLId) {
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
    return new TextEncoder().encode(this.toPrivateJson());
  }

  /**
   * Convert public profile data to CBL data
   */
  public async toPublicCBLData(): Promise<Uint8Array> {
    try {
      const json = this.toPublicJson();
      const data = new TextEncoder().encode(json);

      // Create a CBL block for this data
      const block = await this.cblService.createMemberCbl(
        this.creator,
        this.creator,
      );

      this.publicCBLId = block.idChecksum;
      return data;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Convert private profile data to CBL data
   */
  public async toPrivateCBLData(): Promise<Uint8Array> {
    try {
      const json = this.toPrivateJson();
      const data = new TextEncoder().encode(json);

      // Create a CBL block for this data
      const block = await this.cblService.createMemberCbl(
        this.creator,
        this.creator,
      );

      this.privateCBLId = block.idChecksum;
      return data;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Update public profile data
   */
  public updatePublicData(
    updates: Partial<IPublicMemberProfileHydratedData<TID>>,
  ): void {
    const schema = publicMemberProfileHydrationSchema<TID>();
    const current = this.getPublicHydrated();
    const updated = { ...current, ...updates };
    const storageData = schema.dehydrate(updated);

    // Update the document
    (this.publicDocument as Document<IPublicMemberProfileStorageData>).setData(
      storageData,
    );

    // Invalidate cached CBL
    this.publicCBLId = undefined;
  }

  /**
   * Update private profile data
   */
  public updatePrivateData(
    updates: Partial<IPrivateMemberProfileHydratedData<TID>>,
  ): void {
    const schema = privateMemberProfileHydrationSchema<TID>();
    const current = this.getPrivateHydrated();
    const updated = { ...current, ...updates };
    const storageData = schema.dehydrate(updated);

    // Update the document
    (
      this.privateDocument as Document<IPrivateMemberProfileStorageData>
    ).setData(storageData);

    // Invalidate cached CBL
    this.privateCBLId = undefined;
  }

  /**
   * Add an activity log entry
   */
  public addActivityLogEntry(
    action: string,
    timestamp?: Date,
    metadata?: Record<string, unknown>,
  ): void {
    const current = this.getPrivateHydrated();
    const entryTimestamp = timestamp ?? new Date();
    const entryMetadata = metadata ?? {};

    const newEntry = {
      timestamp: entryTimestamp,
      action,
      details: { ...entryMetadata },
      metadata: { ...entryMetadata },
    };

    this.updatePrivateData({
      activityLog: [...current.activityLog, newEntry],
    });
  }

  /**
   * Add a trusted peer
   */
  public addTrustedPeer(peerId: TID): void {
    const current = this.getPrivateHydrated();
    if (!current.trustedPeers.some((id) => this.idsEqual(id, peerId))) {
      this.updatePrivateData({
        trustedPeers: [...current.trustedPeers, peerId],
      });
    }
  }

  /**
   * Remove a trusted peer
   */
  public removeTrustedPeer(peerId: TID): void {
    const current = this.getPrivateHydrated();
    this.updatePrivateData({
      trustedPeers: current.trustedPeers.filter(
        (id) => !this.idsEqual(id, peerId),
      ),
    });
  }

  /**
   * Add a blocked peer
   */
  public addBlockedPeer(peerId: TID): void {
    const current = this.getPrivateHydrated();
    if (!current.blockedPeers.some((id) => this.idsEqual(id, peerId))) {
      this.updatePrivateData({
        blockedPeers: [...current.blockedPeers, peerId],
      });
    }
  }

  /**
   * Remove a blocked peer
   */
  public removeBlockedPeer(peerId: TID): void {
    const current = this.getPrivateHydrated();
    this.updatePrivateData({
      blockedPeers: current.blockedPeers.filter(
        (id) => !this.idsEqual(id, peerId),
      ),
    });
  }

  /**
   * Helper to compare IDs
   */
  private idsEqual(a: TID, b: TID): boolean {
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const aBytes = a instanceof Uint8Array ? a : provider.toBytes(a);
    const bBytes = b instanceof Uint8Array ? b : provider.toBytes(b);

    if (aBytes.length !== bBytes.length) return false;
    for (let i = 0; i < aBytes.length; i++) {
      if (aBytes[i] !== bBytes[i]) return false;
    }
    return true;
  }
}
