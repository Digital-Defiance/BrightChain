// Remove circular imports
// import { EncryptedBlock } from '../../blocks/encrypted';
// import { EphemeralBlock } from '../../blocks/ephemeral';
import { BrightChainMember } from '../../brightChainMember';
import { BlockDataType } from '../../enumerations/blockDataType';
import { BlockSize } from '../../enumerations/blockSizes';
import { BlockType } from '../../enumerations/blockType';
import { ChecksumBuffer } from '../../types';
import { IEphemeralBlock } from './ephemeral';

/**
 * Interface for encrypted blocks to avoid circular dependencies
 */
export interface IEncryptedBlock extends IEphemeralBlock {
  /**
   * The ephemeral public key used to encrypt the block
   */
  get ephemeralPublicKey(): Buffer;
  /**
   * The initialization vector used to encrypt the block
   */
  get iv(): Buffer;
  /**
   * The authentication tag used to encrypt the block
   */
  get authTag(): Buffer;
  /**
   * The encrypted payload
   */
  get payload(): Buffer;
  /**
   * The length of the encrypted payload
   */
  get encryptedLength(): number;
  /**
   * Decrypt the block
   */
  decrypt<D>(newBlockType: BlockType): Promise<D>;
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
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<IEncryptedBlock>;
}
