import { BlockSize, validBlockSizes, maxFileSizesWithCBL, maxFileSizesWithData } from "./enumerations/blockSizes";

export abstract class BlockService {
  public static getDataWithHeaderBlockSize(dataLength: bigint): BlockSize {
    for (let i = 0; i < maxFileSizesWithData.length; i++) {
      if (dataLength <= maxFileSizesWithData[i]) {
        return validBlockSizes[i];
      }
    }
    throw new Error('Data length is too large');
  }
  public static getCBLBlockSize(dataLength: bigint): BlockSize {
    for (let i = 0; i < maxFileSizesWithCBL.length; i++) {
      if (dataLength <= maxFileSizesWithCBL[i]) {
        return validBlockSizes[i];
      }
    }
    throw new Error('Data length is too large');
  }
}