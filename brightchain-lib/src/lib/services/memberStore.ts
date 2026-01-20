import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  PlatformID,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../blocks/rawData';
import { uint8ArrayToBase64 } from '../bufferUtils';
import { MemberDocument } from '../documents/member/memberDocument';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
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

    // Create initial member data
    const idProvider = ServiceProvider.getInstance<TID>().idProvider;
    const publicData = {
      id: idProvider.serialize(idProvider.toBytes(member.id)), // Convert to bytes then serialize for JSON
      creatorId: idProvider.serialize(idProvider.toBytes(member.id)), // Same as ID for self-created members
      type: data.type,
      name: data.name,
      dateCreated: new Date().toISOString(), // Convert to ISO string for JSON
      dateUpdated: new Date().toISOString(), // Convert to ISO string for JSON
      publicKey: uint8ArrayToBase64(member.publicKey), // Convert to base64 string as expected by Member.fromJson
      votingPublicKey:
        member.votingPublicKey &&
        ServiceProvider.getInstance<TID>().votingService.votingPublicKeyToBuffer(
          member.votingPublicKey,
        ),
      status: MemberStatusType.Active,
      lastSeen: new Date(),
      reputation: 0,
      storageContributed: 0,
      storageUsed: 0,
      region: data.region,
      geographicSpread: 0,
      email: data.contactEmail ? data.contactEmail.toString() : '', // Use 'email' field name as expected by Member.fromJson
    };

    const privateData = {
      id: idProvider.serialize(idProvider.toBytes(member.id)), // Convert to bytes then serialize for JSON
      creatorId: idProvider.serialize(idProvider.toBytes(member.id)), // Same as ID for self-created members
      type: data.type,
      name: data.name,
      dateCreated: new Date().toISOString(), // Convert to ISO string for JSON
      dateUpdated: new Date().toISOString(), // Convert to ISO string for JSON
      publicKey: uint8ArrayToBase64(member.publicKey), // Convert to base64 string as expected by Member.fromJson
      email: data.contactEmail ? data.contactEmail.toString() : '', // Use 'email' field name as expected by Member.fromJson
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

    // Create Member instances
    const publicMember = await Member.fromJson<TID>(
      JSON.stringify({
        ...publicData,
        memberType: data.type,
      }),
      ServiceProvider.getInstance<TID>().eciesService,
    );
    const privateMember = await Member.fromJson<TID>(
      JSON.stringify({
        ...privateData,
        memberType: data.type,
      }),
      ServiceProvider.getInstance<TID>().eciesService,
    );

    // Create a transaction-like operation
    const rollbackOperations: (() => Promise<void>)[] = [];
    let doc: MemberDocument<TID> | undefined;
    let publicBlock: RawDataBlock | undefined;
    let privateBlock: RawDataBlock | undefined;

    try {
      // Step 1: Create member document using factory method
      doc = MemberDocument.create<TID>(publicMember, privateMember);
      rollbackOperations.push(async () => {
        // No cleanup needed for document creation
      });

      // Step 2: Generate CBLs
      await doc.generateCBLs();
      const publicCBL = await doc!.toPublicCBL();
      const privateCBL = await doc!.toPrivateCBL();

      // Step 3: Create blocks
      publicBlock = new RawDataBlock(
        BlockSize.Small,
        publicCBL,
        doc!.dateCreated,
        undefined, // Let RawDataBlock calculate the checksum
        BlockType.RawData,
        BlockDataType.PublicMemberData,
      );

      privateBlock = new RawDataBlock(
        BlockSize.Small,
        privateCBL,
        doc!.dateCreated,
        undefined, // Let RawDataBlock calculate the checksum
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
      const provider = ServiceProvider.getInstance<TID>().idProvider;
      const indexEntry: IMemberIndexEntry<TID> = {
        id: provider.idFromString(doc!.id),
        publicCBL: publicBlock.idChecksum, // Use the actual block checksum
        privateCBL: privateBlock.idChecksum, // Use the actual block checksum
        type: MemberType.User,
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
        id: ServiceProvider.getInstance<TID>().idProvider.idFromString(doc!.id),
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
      ServiceProvider.getInstance<TID>().idProvider.idToString(id),
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
   * Update a member
   */
  public async updateMember(
    id: TID,
    changes: IMemberChanges<TID>,
  ): Promise<void> {
    const indexEntry = this.memberIndex.get(
      ServiceProvider.getInstance<TID>().idProvider.idToString(id),
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
    const indexEntry = this.memberIndex.get(provider.idToString(id));
    if (!indexEntry) {
      throw new MemberError(MemberErrorType.MemberNotFound);
    }

    // Find and remove from name index
    for (const [name, memberId] of this.nameIndex.entries()) {
      if (memberId === provider.idToString(id)) {
        this.nameIndex.delete(name);
        break;
      }
    }

    // Remove from indices
    this.memberIndex.delete(provider.idToString(id));
    if (indexEntry.region) {
      const regionSet = this.regionIndex.get(indexEntry.region);
      if (regionSet) {
        regionSet.delete(provider.idToString(id));
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
    const id = provider.idToString(entry.id);
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
