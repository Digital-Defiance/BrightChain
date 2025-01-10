import { BlockService } from '../blockService';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { ChecksumBuffer } from '../types';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';
import { EphemeralBlock } from './ephemeral';

export class OwnedDataBlock extends EphemeralBlock {
  constructor(
    creator: BrightChainMember | GuidV4,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
  ) {
    super(
      BlockType.OwnedDataBlock,
      BlockDataType.EphemeralStructuredData,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
      false,
    );
  }
  public encrypt(creator: BrightChainMember): EncryptedOwnedDataBlock {
    if (!this.canEncrypt) {
      throw new Error(
        'Block cannot be encrypted, not enough space left in block',
      );
    }
    const encryptedBlock = BlockService.encrypt(creator, this);
    return new EncryptedOwnedDataBlock(
      new OwnedDataBlock(
        creator,
        encryptedBlock.blockSize,
        encryptedBlock.data,
        encryptedBlock.idChecksum,
        encryptedBlock.dateCreated,
      ),
      creator,
    );
  }
}
