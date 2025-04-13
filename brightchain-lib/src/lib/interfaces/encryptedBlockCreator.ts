import {
  ChecksumUint8Array,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { IEncryptedBlock } from './blocks/encrypted';

/**
 * Interface for encrypted block creation to avoid circular dependencies
 */
export interface IEncryptedBlockCreator<TID extends PlatformID = Uint8Array> {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumUint8Array,
    creator: Member<TID>,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<IEncryptedBlock<TID>>;
}
