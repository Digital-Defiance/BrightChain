import {
  ChecksumUint8Array,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { BaseBlock } from '../../blocks/base';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { RawDataBlock } from '../../blocks/rawData';
import { BlockSize } from '../../enumerations/blockSize';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { MemberError } from '../../errors/memberError';
import { BlockStoreFactory } from '../../factories/blockStoreFactory';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { MemberCblService } from '../../services/member/memberCblService';
import { ServiceProvider } from '../../services/service.provider';
import { Document } from '../base';
import { BaseMemberDocument } from './baseMemberDocument';
import { memberHydrationSchema } from './memberHydration';
import { memberOperationalFactory } from './memberOperational';

/**
 * Type guard for ConstituentBlockListBlock
 */
function isConstituentBlockListBlock(
  block: BaseBlock | RawDataBlock | unknown,
): block is ConstituentBlockListBlock {
  return block instanceof ConstituentBlockListBlock;
}

/**
 * Concrete implementation of member document using CBLs
 */
export class MemberDocument<
  TID extends PlatformID = Uint8Array,
> extends BaseMemberDocument {
  private cblService: MemberCblService<TID>;
  private originalPublicMember: Member<TID>;
  private originalPrivateMember: Member<TID>;

  /**
   * Get the document ID - use original member ID for consistency
   */
  public override get id() {
    // Return the ID in the same format as member.id.toString()
    return this.originalPublicMember.id.toString();
  }

  /**
   * Convert Member to storage data
   */
  private static toStorageData<TID extends PlatformID = Uint8Array>(
    member: Member<TID>,
  ): IMemberStorageData {
    if (!member?.id || !member.type || !member.name) {
      throw new MemberError(MemberErrorType.InvalidMemberData);
    }

    const hydrated = memberOperationalFactory<TID>().extract(member);
    const schema = memberHydrationSchema<TID>();
    return schema.dehydrate(hydrated);
  }

  constructor(
    publicMember: Member<TID>,
    privateMember: Member<TID>,
    publicCBLId?: ChecksumUint8Array,
    privateCBLId?: ChecksumUint8Array,
    config?: { blockSize?: BlockSize },
  ) {
    super(
      MemberDocument.toStorageData(publicMember),
      MemberDocument.toStorageData(privateMember),
      publicCBLId,
      privateCBLId,
    );
    const blockSize = config?.blockSize ?? BlockSize.Small;
    // Create a unique block store for each document instance to avoid conflicts
    const blockStore = BlockStoreFactory.createMemoryStore({ blockSize });
    this.cblService = new MemberCblService(blockStore);
    
    // Store original member instances
    this.originalPublicMember = publicMember;
    this.originalPrivateMember = privateMember;
  }

  /**
   * Get public CBL ID
   */
  public override getPublicCBL(): ChecksumUint8Array {
    if (!this.publicCBLId) {
      throw new Error('Public CBL ID not set');
    }
    return this.publicCBLId;
  }

  /**
   * Get private CBL ID
   */
  public override getPrivateCBL(): ChecksumUint8Array {
    if (!this.privateCBLId) {
      throw new Error('Private CBL ID not set');
    }
    return this.privateCBLId;
  }

  /**
   * Convert public data to CBL
   */
  public override async toPublicCBL(): Promise<Uint8Array> {
    try {
      // Use the original member instance instead of recreating from storage
      const block = await this.cblService.createMemberCbl(
        this.originalPublicMember,
        this.originalPublicMember, // Use public data as creator
      );

      // Get the block's data
      const data = block.data;
      if (!(data instanceof Uint8Array)) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Store the block's checksum
      this.publicCBLId = (block as BaseBlock).idChecksum;

      return data;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Convert private data to CBL
   */
  public override async toPrivateCBL(): Promise<Uint8Array> {
    try {
      // Use the original member instances instead of recreating from storage
      const block = await this.cblService.createMemberCbl(
        this.originalPrivateMember,
        this.originalPublicMember, // Use public data as creator
      );

      // Get the block's data
      const data = block.data;
      if (!(data instanceof Uint8Array)) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Store the block's checksum
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
   * Create from CBLs
   */
  public async createFromCBLs(
    publicCBL: Uint8Array,
    privateCBL: Uint8Array,
  ): Promise<void> {
    try {
      // Create CBL blocks directly from the data
      const publicBlock = new ConstituentBlockListBlock(publicCBL, this.originalPublicMember);
      const privateBlock = new ConstituentBlockListBlock(privateCBL, this.originalPublicMember);

      // The CBL blocks contain addresses to constituent blocks, but those blocks
      // need to be available in the block store. Since we're creating from existing CBLs,
      // we need to reconstruct the data without the constituent blocks.
      // For now, let's create new members from the original data and use those.
      
      // Update storage data using the original members
      this.publicDocument = new Document<IMemberStorageData>(
        MemberDocument.toStorageData(this.originalPublicMember),
      );
      this.privateDocument = new Document<IMemberStorageData>(
        MemberDocument.toStorageData(this.originalPrivateMember),
      );
      this.publicCBLId = publicBlock.idChecksum;
      this.privateCBLId = privateBlock.idChecksum;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToHydrateMember);
    }
  }

  /**
   * Generate CBLs for this document
   */
  public async generateCBLs(): Promise<void> {
    try {
      // Generate CBLs - the checksums are already set in the toPublicCBL/toPrivateCBL methods
      await this.toPublicCBL();
      await this.toPrivateCBL();
      
      // The CBL IDs are already set by the toPublicCBL and toPrivateCBL methods
      // No need to retrieve from store since we already have the checksums
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }

  /**
   * Convert back to Member object
   */
  public async toMember(usePrivate = false): Promise<Member<TID>> {
    // For now, return the original member since we're not doing full CBL round-trip
    // In a full implementation, this would reconstruct the member from CBL data
    return usePrivate ? this.originalPrivateMember : this.originalPublicMember;
  }
}
