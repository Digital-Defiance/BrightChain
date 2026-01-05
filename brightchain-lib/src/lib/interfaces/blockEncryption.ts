/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import { ChecksumUint8Array } from '../types';

/**
 * Interface for encrypted block creation to avoid circular dependencies
 */
export interface IEncryptedBlockCreator {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: number,
    data: Buffer,
    checksum: ChecksumUint8Array,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<any>;
}
