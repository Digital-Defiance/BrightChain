import { randomBytes } from "crypto";
import { BaseBlock } from "./baseBlock";
import { BlockSize, blockSizeToLength } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";

export class RandomBlock extends BaseBlock {
  public override readonly blockType = BlockType.Random;
  private constructor(data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(data, dateCreated, checksum);
  }
  public static new(blockSize: BlockSize): RandomBlock {
    const data = randomBytes(blockSizeToLength(blockSize));
    return new RandomBlock(data);
  }
  public static reconstitute(data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer): RandomBlock {
    return new RandomBlock(data, dateCreated, checksum);
  }
}