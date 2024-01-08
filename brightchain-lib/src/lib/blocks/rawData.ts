import { BlockDataType } from "../enumerations/blockDataType";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { BaseBlock } from "./base";

export class RawDataBlock extends BaseBlock {
  public override readonly blockType: BlockType = BlockType.RawData;
  constructor(blockSize: BlockSize, data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, BlockDataType.RawData, data.length, dateCreated, checksum);
  }
}