import {
  ChecksumUint8Array,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from '../../blocks/blockMetadata';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { BlockHandleTuple } from '../../blocks/handleTuple';
import { RawDataBlock } from '../../blocks/rawData';
import { TUPLE } from '../../constants';
import { BlockDataType } from '../../enumerations/blockDataType';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { BlockSize, lengthToClosestBlockSize } from '../../enumerations/blockSize';
import { BlockType } from '../../enumerations/blockType';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { StoreErrorType } from '../../enumerations/storeErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { MemberError } from '../../errors/memberError';
import { StoreError } from '../../errors/storeError';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ServiceProvider } from '../service.provider';

/**
 * Service for creating and managing member CBLs
 */
export class MemberCblService<TID extends PlatformID = Uint8Array> {
  private readonly blockStore: IBlockStore;

  constructor(blockStore: IBlockStore) {
    this.blockStore = blockStore;
  }

  /**
   * Create CBL for member data
   */
  public async createMemberCbl(
    member: Member<TID>,
    creator: Member<TID>,
  ): Promise<ConstituentBlockListBlock<TID>> {
    try {
      // Convert member to JSON string
      const memberJson = member.toJson();
      const memberData = new Uint8Array(Buffer.from(memberJson));

      // Create initial blocks with consistent chunk size
      const blocks: RawDataBlock[] = [];
      const chunkSize = BlockSize.Small as number;
      let offset = 0;
      while (offset < memberData.length) {
        const remainingBytes = memberData.length - offset;
        const actualChunkSize = Math.min(chunkSize, remainingBytes);
        
        // Create a padded chunk of consistent size
        const paddedChunk = new Uint8Array(chunkSize);
        paddedChunk.set(memberData.subarray(offset, offset + actualChunkSize));
        // The rest of the chunk is already zero-padded by default
        
        // Calculate proper checksum for the padded block
        const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(paddedChunk);
        
        const block = new RawDataBlock(
          BlockSize.Small,
          paddedChunk,
          new Date(),
          checksum,
          BlockType.RawData,
          BlockDataType.PublicMemberData,
          true, // canRead
          true, // canPersist
        );
        blocks.push(block);
        offset += actualChunkSize; // Move by actual data size, not padded size
      }

      // Create tuples with random blocks
      const tuples: BlockHandleTuple[] = [];
      for (const block of blocks) {
        try {
          // Store the initial block
          await this.blockStore.setData(block);
        } catch (error) {
          // If block already exists, that's okay for this test scenario
          if ((error instanceof StoreError && error.type === StoreErrorType.BlockAlreadyExists) ||
              (error instanceof Error && error.message.includes('already exists'))) {
            // Skip storing, but continue with the process
          } else {
            throw error;
          }
        }
        const blockHandle = this.blockStore.get(block.idChecksum);

        // Get random blocks
        const randomBlocks = await this.blockStore.getRandomBlocks(
          TUPLE.SIZE - 1,
        );
        
        // If we don't have enough random blocks, create dummy blocks
        const neededRandomBlocks = TUPLE.SIZE - 1;
        const actualRandomBlocks = randomBlocks.length;
        const missingBlocks = neededRandomBlocks - actualRandomBlocks;
        
        if (missingBlocks > 0) {
          // Create dummy blocks to fill the gap with the same size as the original blocks
          for (let i = 0; i < missingBlocks; i++) {
            const dummyData = new Uint8Array(chunkSize); // Use consistent chunk size
            crypto.getRandomValues(dummyData);
            
            // Calculate proper checksum for the dummy block
            const dummyChecksum = ServiceProvider.getInstance().checksumService.calculateChecksum(dummyData);
            
            const dummyBlock = new RawDataBlock(
              BlockSize.Small,
              dummyData,
              new Date(),
              dummyChecksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
              true,
              true,
            );
            try {
              await this.blockStore.setData(dummyBlock);
              randomBlocks.push(dummyBlock.idChecksum);
            } catch (error) {
              // If block already exists, that's okay
              if ((error instanceof StoreError && error.type === StoreErrorType.BlockAlreadyExists) ||
                  (error instanceof Error && error.message.includes('already exists'))) {
                randomBlocks.push(dummyBlock.idChecksum);
              } else {
                throw error;
              }
            }
          }
        }

        // Create handles for random blocks
        const randomHandles = randomBlocks.map((checksum: ChecksumUint8Array) =>
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
      const addresses: ChecksumUint8Array[] = [];
      for (const tuple of tuples) {
        addresses.push(...tuple.blockIds);
      }

      // Create CBL header
      const addressesArray = new Uint8Array(
        addresses.reduce((acc, addr) => acc + addr.length, 0),
      );
      let addressOffset = 0;
      for (const addr of addresses) {
        addressesArray.set(addr, addressOffset);
        addressOffset += addr.length;
      }
      const { headerData } =
        ServiceProvider.getInstance<TID>().cblService.makeCblHeader(
          creator,
          new Date(),
          addresses.length,
          memberData.length,
          addressesArray,
          BlockSize.Small,
          BlockEncryptionType.None,
        );

      // Create CBL block
      const cblData = new Uint8Array(headerData.length + addressesArray.length);
      cblData.set(headerData, 0);
      cblData.set(addressesArray, headerData.length);
      const cbl = new ConstituentBlockListBlock(cblData, creator);

      // Don't store the CBL block itself in the block store - just return it
      // The CBL is the final result we want to return
      return cbl;
    } catch (error) {
      console.error('MemberCblService.createMemberCbl error:', error);
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
    cbl: ConstituentBlockListBlock<TID>,
  ): Promise<Member<TID>> {
    try {
      // Get tuples from CBL
      const tuples = await cbl.getHandleTuples(this.blockStore);

      // XOR each tuple to get original blocks
      const blocks: Uint8Array[] = [];
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
      const combinedLength = blocks.reduce(
        (acc, block) => acc + block.length,
        0,
      );
      const combined = new Uint8Array(combinedLength);
      let combineOffset = 0;
      for (const block of blocks) {
        combined.set(block, combineOffset);
        combineOffset += block.length;
      }
      
      // Find the actual end of the JSON data (look for null bytes)
      let actualLength = combined.length;
      for (let i = combined.length - 1; i >= 0; i--) {
        if (combined[i] !== 0) {
          actualLength = i + 1;
          break;
        }
      }
      
      const trimmedData = combined.subarray(0, actualLength);
      const memberJson = new TextDecoder().decode(trimmedData);
      
      try {
        const member = await Member.fromJson<TID>(memberJson);

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
  public getBlockStore(): IBlockStore {
    return this.blockStore;
  }
}
