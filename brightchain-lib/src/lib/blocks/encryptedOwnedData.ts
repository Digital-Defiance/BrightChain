import { BrightChainMember } from '../brightChainMember';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';
import { EncryptedBlockFactory } from './encryptedBlockFactory';

/**
 * EncryptedOwnedDataBlock represents an encrypted block owned by a specific member.
 * These blocks are always in-memory and ephemeral and should never be committed to disk.
 *
 * Block Structure:
 * [Base Headers][Encryption Header][Encrypted Payload][Padding]
 *
 * Where:
 * - Base Headers: Headers from parent classes
 * - Encryption Header: [Ephemeral Public Key][IV][Auth Tag]
 * - Encrypted Payload: Original data encrypted with ECIES
 * - Padding: Random data to fill block size
 */
export class EncryptedOwnedDataBlock extends EncryptedBlock {
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ): Promise<EncryptedOwnedDataBlock> {
    return EncryptedBlockFactory.createBlock(
      type,
      dataType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
      canPersist,
    ) as Promise<EncryptedOwnedDataBlock>;
  }

  /**
   * Creates an instance of EncryptedOwnedDataBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param dateCreated - The date the block was created
   * @param metadata - The block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  public constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EncryptedBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
  }

  /**
   * Whether the block can be encrypted
   * Always returns false since this block is already encrypted
   */
  public override get canEncrypt(): boolean {
    return false;
  }

  /**
   * Whether the block can be decrypted
   * Returns true if the block has a BrightChainMember creator
   * (GuidV4 creators cannot decrypt since they don't have private keys)
   */
  public override get canDecrypt(): boolean {
    return this.creator instanceof BrightChainMember;
  }

  /**
   * Whether the block can be signed
   * Returns true if the block has any creator
   * Both BrightChainMember and GuidV4 creators can sign
   */
  public override get canSign(): boolean {
    return this.creator !== undefined;
  }
}

// Register block types with the factory
EncryptedBlockFactory.registerBlockType(
  BlockType.EncryptedOwnedDataBlock,
  EncryptedOwnedDataBlock,
);

// Register support for EncryptedConstituentBlockListBlock type
EncryptedBlockFactory.registerBlockType(
  BlockType.EncryptedConstituentBlockListBlock,
  EncryptedOwnedDataBlock,
);
