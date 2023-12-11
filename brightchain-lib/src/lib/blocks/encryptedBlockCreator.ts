import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from '../enumerations';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { Checksum } from '../types/checksum';
import { EncryptedBlock } from './encrypted';

/**
 * Interface for block creation functions
 */
export type BlockCreatorFunction<TID extends PlatformID = Uint8Array> = (
  type: BlockType,
  dataType: BlockDataType,
  blockSize: BlockSize,
  data: Uint8Array,
  checksum: Checksum,
  creator: Member<TID>,
  dateCreated?: Date,
  lengthBeforeEncryption?: number,
) => Promise<EncryptedBlock<TID>>;

/**
 * Block creator registry to avoid circular dependencies
 */
export class EncryptedBlockCreator {
  private static creators = new Map<
    BlockType,
    BlockCreatorFunction<PlatformID>
  >();

  public static register<TID extends PlatformID = Uint8Array>(
    type: BlockType,
    creator: BlockCreatorFunction<TID>,
  ): void {
    EncryptedBlockCreator.creators.set(
      type,
      creator as unknown as BlockCreatorFunction<PlatformID>,
    );
  }

  public static async create<TID extends PlatformID = Uint8Array>(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Uint8Array,
    checksum: Checksum,
    creator: Member<TID>,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<EncryptedBlock<TID>> {
    const blockCreator = EncryptedBlockCreator.creators.get(type);
    if (!blockCreator) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate,
        { TYPE: type },
      );
    }
    return blockCreator(
      type,
      dataType,
      blockSize,
      data,
      checksum,
      creator as Member<PlatformID>,
      dateCreated,
      lengthBeforeEncryption,
    ) as Promise<EncryptedBlock<TID>>;
  }
}
