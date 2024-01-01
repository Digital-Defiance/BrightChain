import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { EphemeralBlock } from "./ephemeral";

export class OwnedDataBlock extends EphemeralBlock {
  public override readonly blockType: BlockType = BlockType.OwnedDataBlock;
  constructor(blockSize: BlockSize, data: Buffer, lengthBeforeEncryption: number, encrypted: boolean, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, true, encrypted, lengthBeforeEncryption, dateCreated, checksum);
  }
}