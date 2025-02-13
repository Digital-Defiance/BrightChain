import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import { BlockCreator } from './blockCreator';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';
import { OwnedDataBlock } from './ownedData';
import { BlockServices } from './services';

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

    const eciesService = BlockServices.getECIESService();
    const checksumService = BlockServices.getChecksumService();

    const encryptedBuffer = eciesService.encrypt(creator.publicKey, block.data);

    // Create padded buffer filled with random data for the payload area only
    const payloadBuffer = randomBytes(
      block.blockSize - eciesService.eciesOverheadLength,
    );
    // Create final buffer
    const finalBuffer = Buffer.alloc(block.blockSize);
    // Copy ECIES header (ephemeral public key, IV, auth tag)
    encryptedBuffer.copy(finalBuffer, 0, 0, eciesService.eciesOverheadLength);
    // Copy encrypted data into payload area
    encryptedBuffer.copy(
      finalBuffer,
      eciesService.eciesOverheadLength,
      eciesService.eciesOverheadLength,
      Math.min(encryptedBuffer.length, block.blockSize),
    );
    // Fill remaining space with random data
    payloadBuffer.copy(
      finalBuffer,
      eciesService.eciesOverheadLength +
        encryptedBuffer.length -
        eciesService.eciesOverheadLength,
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
