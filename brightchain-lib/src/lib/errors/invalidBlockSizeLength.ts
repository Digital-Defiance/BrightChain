import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class InvalidBlockSizeLengthError extends Error {
  public readonly blockSize: number;
  constructor(blockSize: number, _language?: string) {
    super(
      translate(BrightChainStrings.Error_BlockSize_InvalidTemplate, {
        BLOCK_SIZE: blockSize,
      }),
    );
    this.blockSize = blockSize;
    this.name = 'InvalidBlockSizeLengthError';
    Object.setPrototypeOf(this, InvalidBlockSizeLengthError.prototype);
  }
}
