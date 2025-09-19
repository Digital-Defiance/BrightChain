import { BaseBlock } from '../../blocks/base';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { RawDataBlock } from '../../blocks/rawData';
import { BrightChainMember } from '../../brightChainMember';
import { BlockSize } from '../../enumerations/blockSize';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { MemberError } from '../../errors/memberError';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { MemberCblService } from '../../services/member/memberCblService';
import { ChecksumUint8Array } from '../../types';
import { BaseMemberDocument } from './memberDocument';
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
export class MemberDocument extends BaseMemberDocument {
  private static cblService: MemberCblService;

  private static initialize(config?: {
    storePath?: string;
    blockSize?: number;
  }) {
    if (!MemberDocument.cblService) {
      const storePath = config?.storePath || process.env['MEMBER_STORE_PATH'];
      if (!storePath) {
        throw new Error('Member store path not configured');
      }
      const blockSize =
        config?.blockSize ??
        (parseInt(process.env['BLOCK_SIZE'] ?? '-1') as BlockSize);
      if (!blockSize || (blockSize as number) <= 0) {
        throw new Error('Invalid block size');
      }
      MemberDocument.cblService = new MemberCblService({
        storePath,
        blockSize,
      });
    }
  }

  /**
   * Convert BrightChainMember to storage data
   */
  private static toStorageData(member: BrightChainMember): IMemberStorageData {
    if (!member?.id || !member.type || !member.name) {
      throw new MemberError(MemberErrorType.InvalidMemberData);
    }

    const hydrated = memberOperationalFactory.extract(member);
    return memberHydrationSchema.dehydrate(hydrated);
  }

  constructor(
    publicMember: BrightChainMember,
    privateMember: BrightChainMember,
    publicCBLId?: ChecksumUint8Array,
    privateCBLId?: ChecksumUint8Array,
  ) {
    MemberDocument.initialize();
    super(
      MemberDocument.toStorageData(publicMember),
      MemberDocument.toStorageData(privateMember),
      publicCBLId,
      privateCBLId,
    );
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
  public override async toPublicCBL(): Promise<Buffer> {
    try {
      const hydrated = memberHydrationSchema.hydrate(this.publicData);
      const member = memberOperationalFactory.create(hydrated);
      const block = await MemberDocument.cblService.createMemberCbl(
        member,
        member, // Use public data as creator
      );

      // Get the block's data
      const data = block.data;
      if (!(data instanceof Buffer)) {
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
  public override async toPrivateCBL(): Promise<Buffer> {
    try {
      const privateHydrated = memberHydrationSchema.hydrate(this.privateData);
      const publicHydrated = memberHydrationSchema.hydrate(this.publicData);

      const privateMember = memberOperationalFactory.create(privateHydrated);
      const publicMember = memberOperationalFactory.create(publicHydrated);

      const block = await MemberDocument.cblService.createMemberCbl(
        privateMember,
        publicMember, // Use public data as creator
      );

      // Get the block's data
      const data = block.data;
      if (!(data instanceof Buffer)) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Store the block's checksum
      this.privateCBLId = (block as BaseBlock).idChecksum;

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
  public static override async createFromCBLs(
    publicCBL: Buffer,
    privateCBL: Buffer,
  ): Promise<MemberDocument> {
    try {
      MemberDocument.initialize();

      // Create CBL blocks
      const publicBlock = await MemberDocument.cblService
        .getBlockStore()
        .getData(publicCBL as ChecksumUint8Array);
      const privateBlock = await MemberDocument.cblService
        .getBlockStore()
        .getData(privateCBL as ChecksumUint8Array);

      // Ensure blocks are ConstituentBlockListBlocks
      if (
        !isConstituentBlockListBlock(publicBlock) ||
        !isConstituentBlockListBlock(privateBlock)
      ) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Hydrate members
      const publicMember =
        await MemberDocument.cblService.hydrateMember(publicBlock);
      const privateMember =
        await MemberDocument.cblService.hydrateMember(privateBlock);

      // Create document
      return new MemberDocument(
        publicMember,
        privateMember,
        (publicBlock as BaseBlock).idChecksum,
        (privateBlock as BaseBlock).idChecksum,
      );
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToHydrateMember);
    }
  }

  /**
   * Create a new member document
   */
  public static async createNew(
    publicMember: BrightChainMember,
    privateMember: BrightChainMember,
  ): Promise<MemberDocument> {
    try {
      MemberDocument.initialize();

      // Create document without CBLs
      const doc = new MemberDocument(publicMember, privateMember);

      // Generate CBLs
      const publicCBL = await doc.toPublicCBL();
      const privateCBL = await doc.toPrivateCBL();

      // Create blocks to get checksums
      const publicBlock = await MemberDocument.cblService
        .getBlockStore()
        .getData(publicCBL as ChecksumUint8Array);
      const privateBlock = await MemberDocument.cblService
        .getBlockStore()
        .getData(privateCBL as ChecksumUint8Array);

      // Ensure blocks are ConstituentBlockListBlocks
      if (
        !isConstituentBlockListBlock(publicBlock) ||
        !isConstituentBlockListBlock(privateBlock)
      ) {
        throw new MemberError(MemberErrorType.InvalidMemberBlocks);
      }

      // Create new document with CBL checksums
      return new MemberDocument(
        publicMember,
        privateMember,
        (publicBlock as BaseBlock).idChecksum,
        (privateBlock as BaseBlock).idChecksum,
      );
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(MemberErrorType.FailedToCreateMemberBlocks);
    }
  }
}
