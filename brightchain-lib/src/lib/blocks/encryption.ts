import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import { ServiceProvider } from '../services/service.provider';
import { BlockCreator } from './blockCreator';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';
import { OwnedDataBlock } from './ownedData';

/**
 * Block encryption utilities to avoid circular dependencies
 */
export class BlockEncryption {
  /**
   * Encrypt a block using ECIES
   */
  public static async encrypt(
    creator: BrightChainMember,
    block: OwnedDataBlock,
  ): Promise<EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock> {
    if (!block.canEncrypt) {
      throw new Error('Block cannot be encrypted');
    }

    const eciesService = ServiceProvider.getECIESService();
    const checksumService = ServiceProvider.getChecksumService();

    const encryptedBuffer = eciesService.encrypt(creator.publicKey, block.data);

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

    return await BlockCreator.create(
      block.blockType === BlockType.ConstituentBlockList
        ? BlockType.EncryptedConstituentBlockListBlock
        : BlockType.EncryptedOwnedDataBlock,
      BlockDataType.EncryptedData,
      block.blockSize,
      finalBuffer,
      checksumService.calculateChecksum(finalBuffer),
      creator,
      block.dateCreated,
      block.data.length,
    );
  }
}
