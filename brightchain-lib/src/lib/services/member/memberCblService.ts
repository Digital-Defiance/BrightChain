import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { BlockMetadata } from '../../blocks/blockMetadata';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { BlockHandleTuple } from '../../blocks/handleTuple';
import { RawDataBlock } from '../../blocks/rawData';
import { TUPLE } from '../../constants';
import { BlockDataType } from '../../enumerations/blockDataType';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { BlockType } from '../../enumerations/blockType';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { StoreErrorType } from '../../enumerations/storeErrorType';
import { MemberError } from '../../errors/memberError';
import { StoreError } from '../../errors/storeError';
import { translate } from '../../i18n';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { Checksum } from '../../types/checksum';
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
      // Use the block store's configured block size
      const blockSize = this.blockStore.blockSize;

      // Convert member to JSON string
      const memberJson = member.toJson();
      const memberData = new TextEncoder().encode(memberJson);

      // Create initial blocks with consistent chunk size
      const blocks: RawDataBlock[] = [];
      const chunkSize = blockSize as number;
      let offset = 0;
      while (offset < memberData.length) {
        const remainingBytes = memberData.length - offset;
        const actualChunkSize = Math.min(chunkSize, remainingBytes);

        // Create a padded chunk of consistent size
        const paddedChunk = new Uint8Array(chunkSize);
        paddedChunk.set(memberData.subarray(offset, offset + actualChunkSize));
        // The rest of the chunk is already zero-padded by default

        // Calculate proper checksum for the padded block
        const checksum =
          ServiceProvider.getInstance().checksumService.calculateChecksum(
            paddedChunk,
          );

        const block = new RawDataBlock(
          blockSize,
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
          if (
            (error instanceof StoreError &&
              error.type === StoreErrorType.BlockAlreadyExists) ||
            (error instanceof Error && error.message.includes('already exists'))
          ) {
            // Skip storing, but continue with the process
          } else {
            throw error;
          }
        }
        const blockHandle = this.blockStore.get(block.idChecksum);

        // Get random blocks, excluding the original block
        let randomBlocks = await this.blockStore.getRandomBlocks(
          TUPLE.SIZE - 1,
        );

        // Filter out the original block from random blocks
        randomBlocks = randomBlocks.filter(
          (checksum) => !checksum.equals(block.idChecksum),
        );

        // If we don't have enough random blocks, create dummy blocks
        const neededRandomBlocks = TUPLE.SIZE - 1;
        const actualRandomBlocks = randomBlocks.length;
        let missingBlocks = neededRandomBlocks - actualRandomBlocks;

        while (missingBlocks > 0) {
          // Create dummy blocks to fill the gap with the same size as the original blocks
          const dummyData = new Uint8Array(chunkSize); // Use consistent chunk size
          crypto.getRandomValues(dummyData);

          // Calculate proper checksum for the dummy block
          const dummyChecksum =
            ServiceProvider.getInstance().checksumService.calculateChecksum(
              dummyData,
            );

          // Skip if this dummy block has the same checksum as the original block
          if (dummyChecksum.equals(block.idChecksum)) {
            continue;
          }

          // Skip if this dummy block already exists in randomBlocks
          if (randomBlocks.some((c) => c.equals(dummyChecksum))) {
            continue;
          }

          const dummyBlock = new RawDataBlock(
            blockSize,
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
            missingBlocks--;
          } catch (error) {
            // If block already exists, that's okay
            if (
              (error instanceof StoreError &&
                error.type === StoreErrorType.BlockAlreadyExists) ||
              (error instanceof Error &&
                error.message.includes('already exists'))
            ) {
              randomBlocks.push(dummyBlock.idChecksum);
              missingBlocks--;
            } else {
              throw error;
            }
          }
        }

        // Create handles for random blocks
        const randomHandles = randomBlocks.map((checksum: Checksum) =>
          this.blockStore.get(checksum),
        );

        // Create tuple with all handles
        const tuple = new BlockHandleTuple([blockHandle, ...randomHandles]);

        // Create metadata for XORed block
        const metadata = new BlockMetadata(
          blockSize,
          BlockType.RawData,
          BlockDataType.PublicMemberData,
          memberData.length,
          new Date(),
        );

        // XOR the tuple and store result - this creates the whitened block
        // The whitened block = originalBlock ^ randomBlock1 ^ randomBlock2
        const xoredHandle = await tuple.xor(this.blockStore, metadata);

        // Create a new tuple with [whitenedBlock, randomBlock1, randomBlock2]
        // This is the correct OFF system pattern: store the XORed result with the random blocks
        // During hydration: whitenedBlock ^ randomBlock1 ^ randomBlock2 = originalBlock
        const whitenedTuple = new BlockHandleTuple([
          xoredHandle,
          ...randomHandles,
        ]);
        tuples.push(whitenedTuple);
      }

      // Get all block addresses
      const addresses: Checksum[] = [];
      for (const tuple of tuples) {
        addresses.push(...tuple.blockIds);
      }

      // Create CBL header
      const addressesArray = new Uint8Array(
        addresses.reduce((acc, addr) => acc + addr.toUint8Array().length, 0),
      );
      let addressOffset = 0;
      for (const addr of addresses) {
        addressesArray.set(addr.toUint8Array(), addressOffset);
        addressOffset += addr.toUint8Array().length;
      }
      const { headerData } =
        ServiceProvider.getInstance<TID>().cblService.makeCblHeader(
          creator,
          new Date(),
          addresses.length,
          memberData.length,
          addressesArray,
          blockSize,
          BlockEncryptionType.None,
        );

      // Create CBL block
      const cblData = new Uint8Array(headerData.length + addressesArray.length);
      cblData.set(headerData, 0);
      cblData.set(addressesArray, headerData.length);
      const cbl = new ConstituentBlockListBlock(cblData, creator, blockSize);

      // Don't store the CBL block itself in the block store - just return it
      // The CBL is the final result we want to return
      return cbl;
    } catch (error) {
      console.error(
        translate(
          BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed,
        ),
        error,
      );
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(
        MemberErrorType.FailedToCreateMemberBlocks,
        LanguageCodes.EN_US,
      );
    }
  }

  /**
   * Hydrate member from CBL with integrity verification.
   *
   * @param cbl - The ConstituentBlockListBlock containing member data
   * @returns The reconstructed Member object
   * @throws MemberError with InvalidMemberData if integrity verification fails
   * @throws MemberError with FailedToHydrateMember if hydration fails
   * @requirements 5.1, 5.2, 5.3, 5.5
   */
  public async hydrateMember(
    cbl: ConstituentBlockListBlock<TID>,
  ): Promise<Member<TID>> {
    try {
      // Use the block store's configured block size
      const blockSize = this.blockStore.blockSize;
      const checksumService = ServiceProvider.getInstance().checksumService;

      // Get tuples from CBL
      const tuples = await cbl.getHandleTuples(this.blockStore);

      // Verify each constituent block's checksum (Requirement 5.2)
      for (const tuple of tuples) {
        for (const blockId of tuple.blockIds) {
          try {
            const block = await this.blockStore.getData(blockId);
            const calculatedChecksum = checksumService.calculateChecksum(
              block.data,
            );

            if (!calculatedChecksum.equals(blockId)) {
              // Log integrity failure with debugging details (Requirement 5.5)
              console.error(
                translate(
                  BrightChainStrings.Error_MemberCblService_ChecksumMismatch,
                ),
                {
                  expectedChecksum: blockId.toHex(),
                  calculatedChecksum: calculatedChecksum.toHex(),
                },
              );
              throw new MemberError(
                MemberErrorType.InvalidMemberData,
                LanguageCodes.EN_US,
              );
            }
          } catch (error) {
            if (error instanceof MemberError) {
              throw error;
            }
            // Log block retrieval failure (Requirement 5.5)
            console.error(
              translate(
                BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed,
              ),
              {
                blockId: blockId.toHex(),
                error: error instanceof Error ? error.message : String(error),
              },
            );
            throw new MemberError(
              MemberErrorType.InvalidMemberData,
              LanguageCodes.EN_US,
            );
          }
        }
      }

      // XOR each tuple to get original blocks
      const blocks: Uint8Array[] = [];
      for (const tuple of tuples) {
        // Create metadata for XORed block
        const metadata = new BlockMetadata(
          blockSize,
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
        const eciesService = ServiceProvider.getInstance<TID>().eciesService;
        const member = await Member.fromJson<TID>(memberJson, eciesService);

        // Verify required member fields (Requirement 5.3)
        if (!member.id || !member.type) {
          console.error(
            translate(
              BrightChainStrings.Error_MemberCblService_MissingRequiredFields,
            ),
            {
              hasId: !!member.id,
              hasType: !!member.type,
            },
          );
          throw new MemberError(
            MemberErrorType.InvalidMemberData,
            LanguageCodes.EN_US,
          );
        }

        return member;
      } catch (error) {
        if (error instanceof MemberError) {
          throw error;
        }
        throw new MemberError(
          MemberErrorType.FailedToConvertMemberData,
          LanguageCodes.EN_US,
        );
      }
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      throw new MemberError(
        MemberErrorType.FailedToHydrateMember,
        LanguageCodes.EN_US,
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
