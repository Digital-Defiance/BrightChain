/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChecksumUint8Array, Member } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';

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
    creator: Member,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<any>;
}
