import { Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import BlockType from '../../enumerations/blockType';
import { IBaseBlock } from './base';

// Forward declaration to avoid circular dependency
export interface IEncryptedBlockBase<TID extends PlatformID = Uint8Array>
  extends IBaseBlock {
  get recipientWithKey(): Member<TID>;
}

export interface IEphemeralBlock<
  TID extends PlatformID = Uint8Array,
> extends IBaseBlock {
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
  get creator(): Member<TID> | undefined;
  get data(): Uint8Array;

  encrypt(
    newBlockType: BlockType,
    recipients?: Member<TID>[],
  ): Promise<IEncryptedBlockBase<TID>>;
}
