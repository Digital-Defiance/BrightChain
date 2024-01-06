import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { BaseBlock } from "./base";

export class ParityBlock extends BaseBlock {
  public override readonly blockType: BlockType = BlockType.FECData;
  public override readonly rawData: boolean = true;
  public override readonly encrypted: boolean = false;
  constructor(blockSize: BlockSize, data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, true, false, data.length, dateCreated, checksum);
  }
}