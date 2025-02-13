import { ECIES } from '../../constants';
import { EciesErrorType } from '../../enumerations/eciesErrorType';
import { EciesError } from '../../errors/eciesError';
import { IEncryptionLength } from '../../interfaces/encryptionLength';

/**
 * Utility functions for ECIES operations
 */
export class EciesUtilities {
  /**
   * Computes the encrypted length from the data length.
   * @param dataLength - The length of the data.
   * @param blockSize - The block size.
   * @returns The encrypted length details.
   */
  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    blockSize: number,
  ): IEncryptionLength {
    if (dataLength < 0) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }
    if (blockSize <= ECIES.OVERHEAD_SIZE) {
      throw new EciesError(EciesErrorType.InvalidBlockType);
    }

    const capacityPerBlock = blockSize - ECIES.OVERHEAD_SIZE;
    const blocksNeeded = Math.ceil(dataLength / capacityPerBlock);
    const padding =
      blocksNeeded > 0 ? capacityPerBlock - (dataLength % capacityPerBlock) : 0;

    // Adjust padding to handle the case where data length is exactly a multiple of capacityPerBlock
    const adjustedPadding =
      dataLength % capacityPerBlock === 0 && dataLength > 0 ? 0 : padding;

    const totalEncryptedSize = blocksNeeded * blockSize;
    const encryptedDataLength = totalEncryptedSize - adjustedPadding;

    return {
      capacityPerBlock,
      blocksNeeded,
      padding: adjustedPadding,
      encryptedDataLength,
      totalEncryptedSize,
    };
  }

  /**
   * Computes the decrypted length from the encrypted data length.
   * @param encryptedDataLength - The length of the encrypted data.
   * @param blockSize - The block size.
   * @param padding - Optional padding value.
   * @returns The decrypted length.
   */
  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    blockSize: number,
    padding?: number,
  ): number {
    if (encryptedDataLength < 0) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }
    if (blockSize <= ECIES.OVERHEAD_SIZE) {
      throw new EciesError(EciesErrorType.InvalidBlockType);
    }

    const numBlocks = Math.ceil(encryptedDataLength / blockSize);
    if (numBlocks * blockSize !== encryptedDataLength) {
      throw new EciesError(
        EciesErrorType.InvalidEncryptedDataLength,
        undefined,
        {
          message: 'Encrypted data length must be a multiple of block size',
          encryptedDataLength: String(encryptedDataLength),
          blockSize: String(blockSize),
          numBlocks: String(numBlocks),
          expectedLength: String(numBlocks * blockSize),
        },
      );
    }

    const overhead = numBlocks * ECIES.OVERHEAD_SIZE;
    const actualPadding = padding !== undefined ? padding : 0;

    const decryptedLength = encryptedDataLength - overhead - actualPadding;
    if (decryptedLength < 0) {
      throw new EciesError(
        EciesErrorType.InvalidEncryptedDataLength,
        undefined,
        {
          message: 'Computed decrypted length is negative',
          encryptedDataLength: String(encryptedDataLength),
          overhead: String(overhead),
          padding: String(actualPadding),
          computedLength: String(decryptedLength),
        },
      );
    }

    return decryptedLength;
  }
}
