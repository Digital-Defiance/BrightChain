import {
  ECIESService,
  EmailString,
  hexToUint8Array,
  Member,
  PlatformID,
  SecureString,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../blocks/rawData';
import { MemberDocument } from '../documents/member/memberDocument';
import { MemberProfileDocument } from '../documents/member/memberProfileDocument';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import { MemberErrorType } from '../enumerations/memberErrorType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { MemberError } from '../errors/memberError';
import { NotImplementedError } from '../errors/notImplemented';
import {
  IMemberChanges,
  IMemberIndexEntry,
  IMemberQueryCriteria,
  IMemberReference,
  IMemberStore,
  INewMemberData,
} from '../interfaces/member/memberData';
import {
  IPrivateMemberProfileHydratedData,
  IPublicMemberProfileHydratedData,
} from '../interfaces/member/profileStorage';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { ServiceProvider } from './service.provider';

/**
 * Service for storing and retrieving member data
 */
export class MemberStore<
  TID extends PlatformID = Uint8Array,
> implements IMemberStore<TID> {
  private readonly blockStore: IBlockStore;
  private readonly memberIndex: Map<string, IMemberIndexEntry<TID>>;
  private readonly regionIndex: Map<string, Set<string>>;
  private readonly nameIndex: Map<string, string>; // name -> member ID mapping

  constructor(blockStore: IBlockStore) {
    this.blockStore = blockStore;
    this.memberIndex = new Map<string, IMemberIndexEntry<TID>>();
    this.regionIndex = new Map<string, Set<string>>();
    this.nameIndex = new Map<string, string>();
  }

  /**
   * Create a new member
   */
  public async createMember(
    data: INewMemberData,
  ): Promise<{ reference: IMemberReference<TID>; mnemonic: SecureString }> {
    // Check if member already exists by name
    if (this.nameIndex.has(data.name)) {
      throw new MemberError(MemberErrorType.MemberAlreadyExists);
    }

    // Create member with Member
    const eciesService = ServiceProvider.getInstance().eciesService;
    const { member, mnemonic } = Member.newMember<TID>(
      eciesService as ECIESService<TID>,
      data.type,
      data.name,
      data.contactEmail,
    );

    // Create a transaction-like operation
    // Identity data is extracted from the Member object by MemberDocument.create()
    // Profile data (status, reputation, settings, etc.) is stored in MemberProfileDocument
    const rollbackOperations: (() => Promise<void>)[] = [];
    let doc: MemberDocument<TID> | undefined;
    let profileDoc: MemberProfileDocument<TID> | undefined;
    let publicBlock: RawDataBlock | undefined;
    let privateBlock: RawDataBlock | undefined;
    let publicProfileBlock: RawDataBlock | undefined;
    let privateProfileBlock: RawDataBlock | undefined;

    try {
      // Step 1: Create member document using factory method with block store's block size
      // Use the original 'member' which has the private key for signing CBLs
      doc = MemberDocument.create<TID>(member, member, undefined, undefined, {
        blockSize: this.blockStore.blockSize,
      });
      rollbackOperations.push(async () => {
        // No cleanup needed for document creation
      });

      // Step 2: Create profile document with operational data
      const publicProfileData: IPublicMemberProfileHydratedData<TID> = {
        id: member.id,
        status: MemberStatusType.Active,
        reputation: 0,
        storageQuota: BigInt(1024 * 1024 * 100), // 100MB default quota
        storageUsed: BigInt(0),
        lastActive: new Date(),
        dateCreated: new Date(),
        dateUpdated: new Date(),
      };

      const privateProfileData: IPrivateMemberProfileHydratedData<TID> = {
        id: member.id,
        trustedPeers: [],
        blockedPeers: [],
        settings: data.settings || {
          autoReplication: true,
          minRedundancy: 3,
          preferredRegions: [],
        },
        activityLog: [],
        dateCreated: new Date(),
        dateUpdated: new Date(),
      };

      profileDoc = MemberProfileDocument.create<TID>(
        member,
        publicProfileData,
        privateProfileData,
        { blockSize: this.blockStore.blockSize },
      );
      rollbackOperations.push(async () => {
        // No cleanup needed for document creation
      });

      // Step 3: Generate CBLs for both documents
      await doc.generateCBLs();
      await profileDoc.generateCBLs();
      const publicCBL = doc!.getPublicCBL();
      const privateCBL = doc!.getPrivateCBL();
      const publicProfileCBL = profileDoc!.getPublicCBL();
      const privateProfileCBL = profileDoc!.getPrivateCBL();

      // Step 4: Create blocks for identity
      publicBlock = new RawDataBlock(
        this.blockStore.blockSize,
        publicCBL.toUint8Array(),
        doc!.dateCreated,
        undefined, // Let RawDataBlock calculate the checksum
        BlockType.RawData,
        BlockDataType.PublicMemberData,
      );

      privateBlock = new RawDataBlock(
        this.blockStore.blockSize,
        privateCBL.toUint8Array(),
        doc!.dateCreated,
        undefined, // Let RawDataBlock calculate the checksum
        BlockType.RawData,
        BlockDataType.PrivateMemberData,
      );

      // Step 5: Create blocks for profile
      publicProfileBlock = new RawDataBlock(
        this.blockStore.blockSize,
        publicProfileCBL.toUint8Array(),
        profileDoc!.dateCreated,
        undefined, // Let RawDataBlock calculate the checksum
        BlockType.RawData,
        BlockDataType.PublicMemberData, // Profile uses same data type
      );

      privateProfileBlock = new RawDataBlock(
        this.blockStore.blockSize,
        privateProfileCBL.toUint8Array(),
        profileDoc!.dateCreated,
        undefined, // Let RawDataBlock calculate the checksum
        BlockType.RawData,
        BlockDataType.PrivateMemberData, // Profile uses same data type
      );

      // Step 6: Store identity blocks
      await this.blockStore.setData(publicBlock);
      rollbackOperations.push(async () => {
        if (publicBlock) {
          await this.blockStore.deleteData(publicBlock.idChecksum);
        }
      });

      await this.blockStore.setData(privateBlock);
      rollbackOperations.push(async () => {
        if (privateBlock) {
          await this.blockStore.deleteData(privateBlock.idChecksum);
        }
      });

      // Step 7: Store profile blocks
      await this.blockStore.setData(publicProfileBlock);
      rollbackOperations.push(async () => {
        if (publicProfileBlock) {
          await this.blockStore.deleteData(publicProfileBlock.idChecksum);
        }
      });

      await this.blockStore.setData(privateProfileBlock);
      rollbackOperations.push(async () => {
        if (privateProfileBlock) {
          await this.blockStore.deleteData(privateProfileBlock.idChecksum);
        }
      });

      // Step 8: Update index
      const provider = ServiceProvider.getInstance<TID>().idProvider;
      const indexEntry: IMemberIndexEntry<TID> = {
        id: provider.fromBytes(hexToUint8Array(doc!.id)),
        publicCBL: publicBlock.idChecksum, // Use the actual block checksum
        privateCBL: privateBlock.idChecksum, // Use the actual block checksum
        publicProfileCBL: publicProfileBlock.idChecksum, // Profile public data
        privateProfileCBL: privateProfileBlock.idChecksum, // Profile private data
        type: data.type,
        status: MemberStatusType.Active,
        lastUpdate: new Date(),
        region: data.region,
        reputation: 0,
      };
      await this.updateIndex(indexEntry);

      // Add to name index
      this.nameIndex.set(data.name, doc!.id);

      rollbackOperations.push(async () => {
        if (doc) {
          this.memberIndex.delete(doc.id);
          this.nameIndex.delete(data.name);
        }
        if (data.region) {
          const regionSet = this.regionIndex.get(data.region);
          if (regionSet && doc) {
            regionSet.delete(doc.id);
          }
        }
      });
    } catch (error) {
      // If any step fails, execute rollback operations in reverse order
      for (const rollback of rollbackOperations.reverse()) {
        try {
          await rollback();
        } catch (rollbackError) {
          // Log rollback errors but continue with remaining rollbacks
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      throw error; // Re-throw the original error
    }

    // Return reference
    return {
      reference: {
        id: ServiceProvider.getInstance<TID>().idProvider.fromBytes(
          hexToUint8Array(doc!.id),
        ),
        type: doc!.type,
        dateVerified: new Date(),
        publicCBL: publicBlock.idChecksum, // Use the actual block checksum
      },
      mnemonic,
    };
  }

  /**
   * Get a member by ID
   */
  public async getMember(id: TID): Promise<Member<TID>> {
    const indexEntry = this.memberIndex.get(
      uint8ArrayToHex(
        ServiceProvider.getInstance<TID>().idProvider.toBytes(id),
      ),
    );
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // Get CBLs
    const _publicBlock = await this.blockStore.getData(indexEntry.publicCBL);
    const _privateBlock = await this.blockStore.getData(indexEntry.privateCBL);

    // For now, create a simple member from the stored data
    // In a full implementation, we would reconstruct from CBL data
    const eciesService = ServiceProvider.getInstance<TID>().eciesService;
    const { member } = Member.newMember<TID>(
      eciesService,
      indexEntry.type,
      'retrieved-member', // Placeholder name
      new EmailString('retrieved@example.com'), // Placeholder email
    );

    return member;
  }

  /**
   * Get member profile document by ID
   */
  public async getMemberProfile(id: TID): Promise<{
    publicProfile: IPublicMemberProfileHydratedData<TID> | null;
    privateProfile: IPrivateMemberProfileHydratedData<TID> | null;
  }> {
    const indexEntry = this.memberIndex.get(
      uint8ArrayToHex(
        ServiceProvider.getInstance<TID>().idProvider.toBytes(id),
      ),
    );
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    let publicProfile: IPublicMemberProfileHydratedData<TID> | null = null;
    let privateProfile: IPrivateMemberProfileHydratedData<TID> | null = null;

    // Get profile CBLs if they exist
    if (indexEntry.publicProfileCBL) {
      const _publicProfileBlock = await this.blockStore.getData(
        indexEntry.publicProfileCBL,
      );
      // TODO: Deserialize CBL data to get the actual profile data
      // For now, return null until full CBL deserialization is implemented
      publicProfile = null;
    }

    if (indexEntry.privateProfileCBL) {
      const _privateProfileBlock = await this.blockStore.getData(
        indexEntry.privateProfileCBL,
      );
      // TODO: Deserialize CBL data to get the actual profile data
      // For now, return null until full CBL deserialization is implemented
      privateProfile = null;
    }

    return { publicProfile, privateProfile };
  }

  /**
   * Update a member
   */
  public async updateMember(
    id: TID,
    changes: IMemberChanges<TID>,
  ): Promise<void> {
    const indexEntry = this.memberIndex.get(
      uint8ArrayToHex(
        ServiceProvider.getInstance<TID>().idProvider.toBytes(id),
      ),
    );
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // For now, just update the index without modifying blocks
    // In a full implementation, we would update the CBL data
    if (changes.indexChanges) {
      await this.updateIndex({
        ...indexEntry,
        ...changes.indexChanges,
        lastUpdate: new Date(),
      });
    }
  }

  /**
   * Delete a member
   */
  public async deleteMember(id: TID): Promise<void> {
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const indexEntry = this.memberIndex.get(
      uint8ArrayToHex(provider.toBytes(id)),
    );
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // Find and remove from name index
    for (const [name, memberId] of this.nameIndex.entries()) {
      if (memberId === uint8ArrayToHex(provider.toBytes(id))) {
        this.nameIndex.delete(name);
        break;
      }
    }

    // Remove from indices
    this.memberIndex.delete(uint8ArrayToHex(provider.toBytes(id)));
    if (indexEntry.region) {
      const regionSet = this.regionIndex.get(indexEntry.region);
      if (regionSet) {
        regionSet.delete(uint8ArrayToHex(provider.toBytes(id)));
      }
    }

    // Note: We don't delete the blocks, as they may be referenced elsewhere
    // The garbage collector will handle unreferenced blocks
  }

  /**
   * Update the member index
   */
  public async updateIndex(entry: IMemberIndexEntry<TID>): Promise<void> {
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const id = uint8ArrayToHex(provider.toBytes(entry.id));
    const oldEntry = this.memberIndex.get(id);

    // Update region index if region changed
    if (oldEntry?.region !== entry.region) {
      if (oldEntry?.region) {
        const oldRegionSet = this.regionIndex.get(oldEntry.region);
        if (oldRegionSet) {
          oldRegionSet.delete(id);
        }
      }
      if (entry.region) {
        let regionSet = this.regionIndex.get(entry.region);
        if (!regionSet) {
          regionSet = new Set<string>();
          this.regionIndex.set(entry.region, regionSet);
        }
        regionSet.add(id);
      }
    }

    // Update member index
    this.memberIndex.set(id, entry);
  }

  /**
   * Query the member index
   */
  public async queryIndex(
    criteria: IMemberQueryCriteria<TID>,
  ): Promise<IMemberReference<TID>[]> {
    let results = Array.from(this.memberIndex.values());

    // Apply filters
    if (criteria.id) {
      results = results.filter(
        (entry) =>
          criteria.id &&
          ServiceProvider.getInstance<TID>().idProvider.equals(
            entry.id,
            criteria.id,
          ),
      );
    }
    if (criteria.type) {
      results = results.filter((entry) => entry.type === criteria.type);
    }
    if (criteria.status) {
      results = results.filter((entry) => entry.status === criteria.status);
    }
    if (criteria.region) {
      results = results.filter((entry) => entry.region === criteria.region);
    }
    if (criteria.minReputation !== undefined) {
      results = results.filter(
        (entry) => entry.reputation >= (criteria.minReputation ?? -1),
      );
    }
    if (criteria.maxReputation !== undefined) {
      results = results.filter(
        (entry) =>
          entry.reputation <= (criteria.maxReputation ?? Number.MAX_VALUE),
      );
    }

    // Apply pagination
    if (criteria.offset) {
      results = results.slice(criteria.offset);
    }
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    // Convert to references
    return results.map((entry) => ({
      id: entry.id,
      type: entry.type,
      status: entry.status,
      dateVerified: entry.lastUpdate,
      publicCBL: entry.publicCBL,
    }));
  }

  /**
   * Sync shard with other nodes
   */

  public async syncShard(_region: string): Promise<void> {
    // TODO: Implement shard synchronization
    throw new NotImplementedError();
  }

  /**
   * Propagate changes to other nodes
   */
  public async propagateChanges(
    _changes: IMemberChanges<TID>[],
  ): Promise<void> {
    // TODO: Implement change propagation
    throw new NotImplementedError();
  }
}
