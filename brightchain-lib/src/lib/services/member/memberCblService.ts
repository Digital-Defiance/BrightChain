import { BlockMetadata } from '../../blocks/blockMetadata';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { BlockHandleTuple } from '../../blocks/handleTuple';
import { RawDataBlock } from '../../blocks/rawData';
import { BrightChainMember } from '../../brightChainMember';
import { TUPLE } from '../../constants';
import { BlockDataType } from '../../enumerations/blockDataType';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { BlockSize } from '../../enumerations/blockSize';
import { BlockType } from '../../enumerations/blockType';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { MemberError } from '../../errors/memberError';
import { DiskBlockAsyncStore } from '../../stores/diskBlockAsyncStore';
import { ChecksumBuffer } from '../../types';
import { ServiceProvider } from '../service.provider';

/**
 * Service for creating and managing member CBLs
 */
export class MemberCblService {
  private readonly blockStore: DiskBlockAsyncStore;

  constructor(config: { storePath: string; blockSize: BlockSize }) {
    if (!config.storePath) {
      throw new Error('Storage path is required');
    }
    if (!config.blockSize) {
      throw new Error('Block size is required');
    }
    this.blockStore = new DiskBlockAsyncStore(config);
  }

  /**
   * Create CBL for member data
   */
  public async createMemberCbl(
    member: BrightChainMember,
    creator: BrightChainMember,
  ): Promise<ConstituentBlockListBlock> {
    try {
      // Convert member to JSON string
      const memberJson = member.toJson();
      const memberData = Buffer.from(memberJson);

      // Create initial blocks
      const blocks: RawDataBlock[] = [];
      let offset = 0;
      while (offset < memberData.length) {
        const chunk = memberData.subarray(
          offset,
          offset + (BlockSize.Small as number),
        );
        const block = new RawDataBlock(
          BlockSize.Small,
          chunk,
          new Date(),
          Buffer.alloc(0) as ChecksumBuffer,
          BlockType.RawData,
          BlockDataType.PublicMemberData,
          true, // canRead
          true, // canPersist
        );
        blocks.push(block);
        offset += BlockSize.Small as number;
      }

      // Create tuples with random blocks
      const tuples: BlockHandleTuple[] = [];
      for (const block of blocks) {
        // Store the initial block
        await this.blockStore.setData(block);
        const blockHandle = this.blockStore.get(block.idChecksum);

        // Get random blocks
        const randomBlocks = await this.blockStore.getRandomBlocks(
          TUPLE.SIZE - 1,
        );
        if (randomBlocks.length !== TUPLE.SIZE - 1) {
          throw new MemberError(
            MemberErrorType.InsufficientRandomBlocks,
            StringLanguages.EnglishUS,
          );
        }

        // Create handles for random blocks
        const randomHandles = randomBlocks.map((checksum) =>
          this.blockStore.get(checksum),
        );

        // Create tuple with all handles
        const tuple = new BlockHandleTuple([blockHandle, ...randomHandles]);

        // Create metadata for XORed block
        const metadata = new BlockMetadata(
          BlockSize.Small,
          BlockType.RawData,
          BlockDataType.PublicMemberData,
          memberData.length,
          new Date(),
        );

        // XOR the tuple and store result
        await tuple.xor(this.blockStore, metadata);
        tuples.push(tuple);
      }

      // Get all block addresses
      const addresses: ChecksumBuffer[] = [];
      for (const tuple of tuples) {
        addresses.push(...tuple.blockIds);
      }

      // Create CBL header
      const { headerData } =
        ServiceProvider.getInstance().cblService.makeCblHeader(
          creator,
          new Date(),
          addresses.length,
          memberData.length,
          Buffer.concat(addresses),
          BlockSize.Small,
          BlockEncryptionType.None,
        );

      // Create CBL block
      const cblData = Buffer.concat([headerData, Buffer.concat(addresses)]);
      const cbl = new ConstituentBlockListBlock(cblData, creator);

      // Store CBL block
      const rawBlock = new RawDataBlock(
        BlockSize.Small,
        cbl.data,
        cbl.metadata.dateCreated,
        cbl.idChecksum,
        BlockType.RawData,
        BlockDataType.PublicMemberData,
        true,
        true,
      );
      await this.blockStore.setData(rawBlock);

      return cbl;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(
        MemberErrorType.FailedToCreateMemberBlocks,
        StringLanguages.EnglishUS,
      );
    }
  }

  /**
   * Hydrate member from CBL
   */
  public async hydrateMember(
    cbl: ConstituentBlockListBlock,
  ): Promise<BrightChainMember> {
    try {
      // Get tuples from CBL
      const tuples = await cbl.getHandleTuples(
        (id) => this.blockStore.get(id).path,
      );

      // XOR each tuple to get original blocks
      const blocks: Buffer[] = [];
      for (const tuple of tuples) {
        // Create metadata for XORed block
        const metadata = new BlockMetadata(
          BlockSize.Small,
          BlockType.RawData,
          BlockDataType.PublicMemberData,
          Number(cbl.originalDataLength),
          new Date(),
        );

        const xoredBlock = await tuple.xor(this.blockStore, metadata);
        blocks.push(xoredBlock.data);
      }

      // Combine blocks and parse JSON
      const memberJson = Buffer.concat(blocks).toString('utf8');
      try {
        const member = BrightChainMember.fromJson(memberJson);

        // Verify member data
        if (!member.id || !member.type) {
          throw new MemberError(
            MemberErrorType.InvalidMemberData,
            StringLanguages.EnglishUS,
          );
        }

        return member;
      } catch (error) {
        if (error instanceof MemberError) {
          throw error;
        }
        throw new MemberError(
          MemberErrorType.FailedToConvertMemberData,
          StringLanguages.EnglishUS,
        );
      }
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(
        MemberErrorType.FailedToHydrateMember,
        StringLanguages.EnglishUS,
      );
    }
  }

  /**
   * Get block store
   */
  public getBlockStore(): DiskBlockAsyncStore {
    return this.blockStore;
  }
}
