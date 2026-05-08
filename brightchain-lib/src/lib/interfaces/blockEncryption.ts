/* eslint-disable @typescript-eslint/no-explicit-any */
import { Member } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';
import { Checksum } from '../types/checksum';

/**
 * Interface for encrypted block creation to avoid circular dependencies.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface IEncryptedBlockCreator {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: number,
    data: Uint8Array,
    checksum: Checksum,
    creator: Member,
    dateCreated?: BrightDateTimestamp,
    lengthBeforeEncryption?: number,
  ): Promise<any>;
}
