import { BlockDataType } from "../enumerations/blockDataType";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { EphemeralBlock } from "./ephemeral";

export class EncryptedOwnedDataBlock extends EphemeralBlock {
  public override readonly blockType: BlockType = BlockType.OwnedDataBlock;
  constructor(blockSize: BlockSize, data: Buffer, lengthBeforeEncryption: number, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, BlockDataType.EncryptedData, lengthBeforeEncryption, dateCreated, checksum);
  }
}