import { GuidV4, SecureString } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../blocks/rawData';
import { BrightChainMember } from '../brightChainMember';
import { MemberDocument } from '../documents/member/memberDocumentImpl';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { MemberErrorType } from '../enumerations/memberErrorType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import MemberType from '../enumerations/memberType';
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
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { ServiceProvider } from './service.provider';

/**
 * Service for storing and retrieving member data
 */
export class MemberStore implements IMemberStore {
  private readonly blockStore: DiskBlockAsyncStore;
  private readonly memberIndex: Map<string, IMemberIndexEntry>;
  private readonly regionIndex: Map<string, Set<string>>;

  constructor(config: { storePath: string; blockSize: BlockSize }) {
    this.blockStore = new DiskBlockAsyncStore(config);
    this.memberIndex = new Map<string, IMemberIndexEntry>();
    this.regionIndex = new Map<string, Set<string>>();
  }

  /**
   * Create a new member
   */
  public async createMember(
    data: INewMemberData,
  ): Promise<{ reference: IMemberReference; mnemonic: SecureString }> {
    // Check if member already exists
    if (this.memberIndex.has(data.name)) {
      throw new MemberError(MemberErrorType.MemberAlreadyExists);
    }

    // Create member with BrightChainMember
    const eciesService = ServiceProvider.getInstance().eciesService;
    const { member, mnemonic } = BrightChainMember.newMember(
      eciesService,
      data.type,
      data.name,
      data.contactEmail,
    );

    // Create initial member data
    const publicData = {
      id: member.id,
      type: data.type,
      name: data.name,
      dateCreated: new Date(),
      dateUpdated: new Date(),
      publicKey: member.publicKey,
      votingPublicKey:
        ServiceProvider.getInstance().votingService.votingPublicKeyToBuffer(
          member.votingPublicKey,
        ),
      status: MemberStatusType.Active,
      lastSeen: new Date(),
      reputation: 0,
      storageContributed: 0,
      storageUsed: 0,
      region: data.region,
      geographicSpread: 0,
    };

    const privateData = {
      id: member.id,
      contactEmail: data.contactEmail,
      trustedPeers: [],
      blockedPeers: [],
      settings: {
        autoReplication: data.settings?.autoReplication ?? true,
        minRedundancy: data.settings?.minRedundancy ?? 3,
        preferredRegions: data.settings?.preferredRegions ?? [],
      },
      activityLog: [
        {
          timestamp: new Date(),
          action: 'MEMBER_CREATED',
          details: {},
        },
      ],
    };

    // Create BrightChainMember instances
    const publicMember = await BrightChainMember.fromJson(
      JSON.stringify({
        ...publicData,
        contactEmail: privateData.contactEmail,
        memberType: data.type,
      }),
    );
    const privateMember = await BrightChainMember.fromJson(
      JSON.stringify({
        ...publicData,
        contactEmail: privateData.contactEmail,
        memberType: data.type,
      }),
    );

    // Create a transaction-like operation
    const rollbackOperations: (() => Promise<void>)[] = [];
    let doc: MemberDocument | undefined;
    let publicBlock: RawDataBlock | undefined;
    let privateBlock: RawDataBlock | undefined;

    try {
      // Step 1: Create member document
      doc = await MemberDocument.createNew(publicMember, privateMember);
      rollbackOperations.push(async () => {
        // No cleanup needed for document creation
      });

      // Step 2: Generate CBLs
      const publicCBL = await doc.toPublicCBL();
      const privateCBL = await doc.toPrivateCBL();

      // Step 3: Create blocks
      publicBlock = new RawDataBlock(
        BlockSize.Small,
        publicCBL,
        doc.dateCreated,
        doc.getPublicCBL(),
        BlockType.RawData,
        BlockDataType.PublicMemberData,
      );

      privateBlock = new RawDataBlock(
        BlockSize.Small,
        privateCBL,
        doc.dateCreated,
        doc.getPrivateCBL(),
        BlockType.RawData,
        BlockDataType.PrivateMemberData,
      );

      // Step 4: Store blocks
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

      // Step 5: Update index
      const indexEntry: IMemberIndexEntry = {
        id: new GuidV4(doc.id),
        publicCBL: doc.getPublicCBL(),
        privateCBL: doc.getPrivateCBL(),
        type: MemberType.User,
        status: MemberStatusType.Active,
        lastUpdate: new Date(),
        region: data.region,
        reputation: 0,
      };
      await this.updateIndex(indexEntry);
      rollbackOperations.push(async () => {
        if (doc) {
          this.memberIndex.delete(doc.id);
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
        id: new GuidV4(doc.id),
        type: doc.type,
        dateVerified: new Date(),
        publicCBL: doc.getPublicCBL(),
      },
      mnemonic,
    };
  }

  /**
   * Get a member by ID
   */
  public async getMember(id: GuidV4): Promise<BrightChainMember> {
    const indexEntry = this.memberIndex.get(id.serialize());
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // Get CBLs
    const publicBlock = await this.blockStore.getData(indexEntry.publicCBL);
    const privateBlock = await this.blockStore.getData(indexEntry.privateCBL);

    // Create document
    const doc = await MemberDocument.createFromCBLs(
      Buffer.from(publicBlock.data),
      Buffer.from(privateBlock.data),
    );

    // Convert to BrightChainMember
    return BrightChainMember.fromJson(doc.toPublicJson());
  }

  /**
   * Update a member
   */
  public async updateMember(
    id: GuidV4,
    changes: IMemberChanges,
  ): Promise<void> {
    const indexEntry = this.memberIndex.get(id.serialize());
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // Get current document
    const publicBlock = await this.blockStore.getData(indexEntry.publicCBL);
    const privateBlock = await this.blockStore.getData(indexEntry.privateCBL);
    const doc = await MemberDocument.createFromCBLs(
      Buffer.from(publicBlock.data),
      Buffer.from(privateBlock.data),
    );

    // Apply changes and create new CBLs
    if (changes.publicChanges) {
      const newPublicBlock = new RawDataBlock(
        BlockSize.Small,
        await doc.toPublicCBL(),
        doc.dateCreated,
        doc.getPublicCBL(),
        BlockType.RawData,
        BlockDataType.PublicMemberData,
      );
      await this.blockStore.setData(newPublicBlock);
    }

    if (changes.privateChanges) {
      const newPrivateBlock = new RawDataBlock(
        BlockSize.Small,
        await doc.toPrivateCBL(),
        doc.dateCreated,
        doc.getPrivateCBL(),
        BlockType.RawData,
        BlockDataType.PrivateMemberData,
      );
      await this.blockStore.setData(newPrivateBlock);
    }

    // Update index
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
  public async deleteMember(id: GuidV4): Promise<void> {
    const indexEntry = this.memberIndex.get(id.serialize());
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // Remove from indices
    this.memberIndex.delete(id.serialize());
    if (indexEntry.region) {
      const regionSet = this.regionIndex.get(indexEntry.region);
      if (regionSet) {
        regionSet.delete(id.serialize());
      }
    }

    // Note: We don't delete the blocks, as they may be referenced elsewhere
    // The garbage collector will handle unreferenced blocks
  }

  /**
   * Update the member index
   */
  public async updateIndex(entry: IMemberIndexEntry): Promise<void> {
    const id = entry.id.serialize();
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
    criteria: IMemberQueryCriteria,
  ): Promise<IMemberReference[]> {
    let results = Array.from(this.memberIndex.values());

    // Apply filters
    if (criteria.id) {
      results = results.filter((entry) =>
        entry.id.equals(criteria.id as GuidV4),
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
  public async propagateChanges(_changes: IMemberChanges[]): Promise<void> {
    // TODO: Implement change propagation
    throw new NotImplementedError();
  }
}
