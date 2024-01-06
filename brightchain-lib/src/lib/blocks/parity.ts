import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { RawDataBlock } from "./rawData";

export class ParityBlock extends RawDataBlock {
  public override readonly blockType: BlockType = BlockType.FECData;
  public override readonly rawData: boolean = true;
  public override readonly encrypted: boolean = false;
  constructor(blockSize: BlockSize, data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, dateCreated, checksum);
  }
}