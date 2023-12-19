import { BlockSize, validBlockSizes, maxFileSizesWithCBL, maxFileSizesWithData } from "./enumerations/blockSizes";

export abstract class BlockService {
  public static getDataWithHeaderBlockSize(dataLength: bigint): BlockSize {
    if (dataLength < BigInt(0)) {
      return BlockSize.Unknown;
    }
    for (let i = 0; i < maxFileSizesWithData.length; i++) {
      if (dataLength <= maxFileSizesWithData[i]) {
        return validBlockSizes[i];
      }
    }
    return BlockSize.Unknown;
  }
  public static getCBLBlockSize(dataLength: bigint): BlockSize {
    if (dataLength < BigInt(0)) {
      return BlockSize.Unknown;
    }
    for (let i = 0; i < maxFileSizesWithCBL.length; i++) {
      if (dataLength <= maxFileSizesWithCBL[i]) {
        return validBlockSizes[i];
      }
    }
    return BlockSize.Unknown;
  }
  public static getBlockSizeForDataLength(dataLength: bigint): BlockSize {
    const dataWithHeaderBlockSize = BlockService.getDataWithHeaderBlockSize(dataLength);
    if (dataWithHeaderBlockSize !== BlockSize.Unknown) {
      return dataWithHeaderBlockSize;
    }
    return BlockService.getCBLBlockSize(dataLength);
  }
}