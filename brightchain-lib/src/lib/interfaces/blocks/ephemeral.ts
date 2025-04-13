import { BrightChainMember } from '../../brightChainMember';
import BlockType from '../../enumerations/blockType';
import { IBaseBlock } from './base';
import { IEncryptedBlock } from './encrypted';

export interface IEphemeralBlock extends IBaseBlock {
  /**
   * Block creation timestamp.
   * Used for:
   * 1. Version tracking
   * 2. Audit trails
   * 3. Lifecycle management
   */
  get dateCreated(): Date;

  /**
   * Original data length before processing.
   * Used for:
   * 1. Storage planning
   * 2. Overhead calculation
   * 3. Efficiency analysis
   */
  get lengthBeforeEncryption(): number;

  /**
   * Whether the block can be encrypted.
   * Determined by:
   * 1. Block type
   * 2. Available space
   * 3. Current state
   */
  canEncrypt(): boolean;
  /**
   * Whether the block can be encrypted for multiple recipients.
   * Determined by:
   * 1. Block type
   * 2. Available space
   * 3. Current state
   */
  canMultiEncrypt(recipientCount: number): boolean;
  get creator(): BrightChainMember | undefined;
  get data(): Buffer;

  /**
   * Encrypt the block for one or more recipients.
   * @param newBlockType The type of the new encrypted block.
   * @param recipients The recipients of the new encrypted block.
   */
  encrypt<E extends IEncryptedBlock>(
    newBlockType: BlockType,
    recipients?: BrightChainMember[],
  ): Promise<E>;
}
