import { BrightChainMember } from "../brightChainMember";
import { BlockDataType } from "../enumerations/blockDataType";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { EncryptedOwnedDataBlock } from "./encryptedOwnedData";
import { EphemeralBlock } from "./ephemeral";

export class OwnedDataBlock extends EphemeralBlock {
  public override readonly blockType: BlockType = BlockType.OwnedDataBlock;
  constructor(blockSize: BlockSize, data: Buffer, lengthBeforeEncryption: number, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, BlockDataType.EphemeralStructuredData, lengthBeforeEncryption, dateCreated, checksum);
  }
  public override encrypt(creator: BrightChainMember): EncryptedOwnedDataBlock {
    const encryptedBlock = super.encrypt(creator);
    return new EncryptedOwnedDataBlock(encryptedBlock.blockSize, encryptedBlock.data, encryptedBlock.lengthBeforeEncryption, encryptedBlock.dateCreated, encryptedBlock.id);
  }
}