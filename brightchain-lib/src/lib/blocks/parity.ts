import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { RawDataBlock } from './rawData';

/**
 * ParityBlock represents a block containing forward error correction (FEC) data.
 * It is used to recover data when some blocks in a tuple are lost or corrupted.
 * The parity data is generated using FecService through ServiceProvider
 */
export class ParityBlock extends RawDataBlock {
  constructor(
    blockSize: BlockSize,
    data: Uint8Array,
    dateCreated?: Date,
    checksum?: ChecksumUint8Array,
    canRead = true,
    canPersist = true,
  ) {
    if (data.length !== blockSize) {
      throw new Error('Data length must match block size');
    }

    super(
      blockSize,
      data,
      dateCreated,
      checksum,
      BlockType.FECData,
      BlockDataType.RawData,
      canRead,
      canPersist,
    );
  }
}
