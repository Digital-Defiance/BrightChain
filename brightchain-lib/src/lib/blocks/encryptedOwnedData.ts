import { BrightChainMember } from "../brightChainMember";
import { BlockDataType } from "../enumerations/blockDataType";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { EphemeralBlock } from "./ephemeral";
import { OwnedDataBlock } from "./ownedData";

export class EncryptedOwnedDataBlock extends EphemeralBlock {
  public override readonly blockType: BlockType = BlockType.EncryptedOwnedDataBlock;
  constructor(blockSize: BlockSize, data: Buffer, lengthBeforeEncryption: number, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(blockSize, data, BlockDataType.EncryptedData, lengthBeforeEncryption, dateCreated, checksum);
  }
  public override decrypt(creator: BrightChainMember): OwnedDataBlock {
    const decryptedBlock = super.decrypt(creator);
    return new OwnedDataBlock(decryptedBlock.blockSize, decryptedBlock.data, decryptedBlock.lengthBeforeEncryption, decryptedBlock.dateCreated, decryptedBlock.id);
  }
}