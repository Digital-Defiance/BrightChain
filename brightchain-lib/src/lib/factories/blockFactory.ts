import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { EphemeralBlock } from '../blocks';
import { RandomBlock } from '../blocks/random';
import { RawDataBlock } from '../blocks/rawData';
import { WhitenedBlock } from '../blocks/whitened';
import { BlockDataType } from '../enumerations';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { ChecksumService } from '../services/checksum.service';
import { Checksum } from '../types/checksum';

/**
 * Factory for creating blocks without circular dependencies.
 * Services use this factory instead of importing blocks directly.
 */
export class BlockFactory<TID extends PlatformID = Uint8Array> {
  constructor(private readonly checksumService: ChecksumService) {}

  createRawDataBlock(
    blockSize: BlockSize,
    data: Uint8Array,
    dateCreated?: Date,
    checksum?: Checksum,
    blockType: BlockType = BlockType.RawData,
    canRead = true,
    canPersist = true,
  ): RawDataBlock {
    const finalChecksum =
      checksum ?? this.checksumService.calculateChecksum(data);
    return new RawDataBlock(
      blockSize,
      data,
      dateCreated,
      finalChecksum,
      blockType,
      undefined,
      canRead,
      canPersist,
      this.checksumService, // Inject checksumService
    );
  }

  createRandomBlock(blockSize: BlockSize): RandomBlock {
    const data = new Uint8Array(blockSize);
    crypto.getRandomValues(data);
    const checksum = this.checksumService.calculateChecksum(data);
    return new RandomBlock(
      blockSize,
      data,
      new Date(),
      checksum,
      this.checksumService,
    );
  }

  createWhitenedBlock(
    blockSize: BlockSize,
    data: Uint8Array,
    randomData: Uint8Array,
  ): WhitenedBlock {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ randomData[i];
    }
    const checksum = this.checksumService.calculateChecksum(result);
    return new WhitenedBlock(
      blockSize,
      result,
      checksum,
      new Date(),
      true,
      true,
      this.checksumService,
    );
  }

  createEphemeralBlock(
    blockSize: BlockSize,
    data: Uint8Array,
    creator: Member<TID>,
    dateCreated: Date = new Date(),
    blockType: BlockType = BlockType.EphemeralOwnedDataBlock,
    blockDataType: BlockDataType = BlockDataType.EphemeralStructuredData,
    canRead = true,
    canPersist = true,
  ): EphemeralBlock<TID> {
    const checksum = this.checksumService.calculateChecksum(data);
    return new EphemeralBlock<TID>(
      blockType,
      blockDataType,
      data,
      checksum,
      new EphemeralBlockMetadata<TID>(
        blockSize,
        blockType,
        blockDataType,
        data.length,
        creator,
        dateCreated,
      ),
      canRead,
      canPersist,
    );
  }
}
