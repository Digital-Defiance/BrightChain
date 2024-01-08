import { randomBytes } from "crypto";
import { BaseBlock } from "./base";
import { BlockSize, lengthToBlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { BlockDataType } from "../enumerations/blockDataType";

export class RandomBlock extends BaseBlock {
  public override readonly blockType = BlockType.Random;
  private constructor(data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    const blockSize = lengthToBlockSize(data.length);
    super(blockSize, data, BlockDataType.RawData, data.length, dateCreated, checksum);
  }
  public static new(blockSize: BlockSize): RandomBlock {
    const data = randomBytes(blockSize as number);
    return new RandomBlock(data);
  }
  public static reconstitute(data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer): RandomBlock {
    return new RandomBlock(data, dateCreated, checksum);
  }
}