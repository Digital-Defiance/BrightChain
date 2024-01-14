import {
  BlockSize,
  validBlockSizes,
  blockSizeLengths,
} from './enumerations/blockSizes';
import { RandomBlocksPerTuple, TupleSize } from './constants';

export abstract class BlockService {
  public static readonly TupleSize = TupleSize;
  public static readonly RandomBlocksPerTuple = RandomBlocksPerTuple;
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
