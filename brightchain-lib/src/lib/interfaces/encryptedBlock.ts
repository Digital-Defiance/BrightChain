import { BaseBlock } from '../blocks/base';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumBuffer } from '../types';

/**
 * Interface for encrypted blocks to avoid circular dependencies
 */
export interface IEncryptedBlock extends BaseBlock {
  readonly canDecrypt: boolean;
  readonly canEncrypt: boolean;
  readonly canSign: boolean;
  readonly ephemeralPublicKey: Buffer;
  readonly iv: Buffer;
  readonly authTag: Buffer;
  readonly payload: Buffer;
  readonly creator?: BrightChainMember;
  readonly data: Buffer;
  readonly encryptedLength: number;
}

/**
 * Interface for encrypted block creation to avoid circular dependencies
 */
export interface IEncryptedBlockCreator {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<IEncryptedBlock>;
}
