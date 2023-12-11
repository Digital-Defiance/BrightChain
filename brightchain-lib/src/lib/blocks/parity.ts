import { BrightChainStrings } from '../enumerations';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { Checksum } from '../types/checksum';
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
    checksum?: Checksum,
    canRead = true,
    canPersist = true,
  ) {
    if (data.length !== blockSize) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize,
      );
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
