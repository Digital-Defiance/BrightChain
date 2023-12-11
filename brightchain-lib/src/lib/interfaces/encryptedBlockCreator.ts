import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { Checksum } from '../types/checksum';
import { IEncryptedBlock } from './blocks/encrypted';

/**
 * Interface for encrypted block creation to avoid circular dependencies.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface IEncryptedBlockCreator<TID extends PlatformID = Uint8Array> {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Uint8Array,
    checksum: Checksum,
    creator: Member<TID>,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<IEncryptedBlock<TID>>;
}
