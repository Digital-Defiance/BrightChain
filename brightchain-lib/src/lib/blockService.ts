import { RANDOM_BLOCKS_PER_TUPLE, TUPLE_SIZE } from './constants';
import {
  BlockSize,
  blockSizeLengths,
  validBlockSizes,
} from './enumerations/blockSizes';

export abstract class BlockService {
  public static readonly TupleSize = TUPLE_SIZE;
  public static readonly RandomBlocksPerTuple = RANDOM_BLOCKS_PER_TUPLE;
  public static getBlockSizeForData(dataLength: number): BlockSize {
    if (dataLength < BigInt(0)) {
      return BlockSize.Unknown;
    }
    for (let i = 0; i < blockSizeLengths.length; i++) {
      if (dataLength <= blockSizeLengths[i]) {
        return validBlockSizes[i];
      }
    }
    return BlockSize.Unknown;
  }
}
