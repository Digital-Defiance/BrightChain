import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockErrorType } from '../enumerations/blockErrorType';
import { BlockType } from '../enumerations/blockType';
import { BlockError } from '../errors/block';
import { ServiceLocator } from '../services/serviceLocator';
import { EncryptedBlock } from './encrypted';
import { EncryptedBlockCreator } from './encryptedBlockCreator';
import { EphemeralBlock } from './ephemeral';

/**
 * Block encryption utilities to avoid circular dependencies
 */
export class BlockEncryption {
  /**
   * Encrypt a block using ECIES
   */
  public static async encrypt(
    creator: BrightChainMember,
    block: EphemeralBlock,
    newBlockType: BlockType,
  ): Promise<EncryptedBlock> {
    if (!block.canEncrypt) {
      throw new Error('Block cannot be encrypted');
    }

    const encryptedBuffer = ServiceLocator.getServiceProvider().eciesService.encrypt(
      creator.publicKey,
      block.data,
    );

    // Create padded buffer filled with random data for the payload area only
    const payloadBuffer = randomBytes(block.blockSize - ECIES.OVERHEAD_SIZE);
    // Create final buffer
    const finalBuffer = Buffer.alloc(block.blockSize);
    // Copy ECIES header (ephemeral public key, IV, auth tag)
    encryptedBuffer.copy(finalBuffer, 0, 0, ECIES.OVERHEAD_SIZE);
    // Copy encrypted data into payload area
    encryptedBuffer.copy(
      finalBuffer,
      ECIES.OVERHEAD_SIZE,
      ECIES.OVERHEAD_SIZE,
      Math.min(encryptedBuffer.length, block.blockSize),
    );
    // Fill remaining space with random data
    payloadBuffer.copy(
      finalBuffer,
      ECIES.OVERHEAD_SIZE + encryptedBuffer.length - ECIES.OVERHEAD_SIZE,
    );

    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        payloadBuffer,
      );

    return await EncryptedBlockCreator.create(
      newBlockType,
      BlockDataType.EncryptedData,
      block.blockSize,
      finalBuffer,
      checksum,
      creator,
      block.dateCreated,
      block.data.length,
    );
  }

  public static async decrypt(
    creator: BrightChainMember,
    block: EncryptedBlock,
    newBlockType: BlockType,
  ): Promise<EphemeralBlock> {
    if (creator.privateKey === undefined) {
      throw new BlockError(BlockErrorType.CreatorPrivateKeyRequired);
    }

    const decryptedBuffer =
      ServiceLocator.getServiceProvider().eciesService.decryptWithHeader(
        creator.privateKey,
        block.data,
      );
    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        decryptedBuffer,
      );
    return await EncryptedBlockCreator.create(
      newBlockType,
      BlockDataType.EphemeralStructuredData,
      block.blockSize,
      decryptedBuffer,
      checksum,
      creator,
      block.dateCreated,
      block.data.length,
    );
  }
}
