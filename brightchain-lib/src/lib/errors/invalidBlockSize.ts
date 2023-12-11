import { BlockSize } from '../enumerations/blockSize';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class InvalidBlockSizeError extends Error {
  public readonly blockSize: BlockSize;
  constructor(blockSize: BlockSize, _language?: string) {
    super(
      translate(BrightChainStrings.Error_BlockSize_InvalidTemplate, {
        BLOCK_SIZE: blockSize as number,
      }),
    );
    this.blockSize = blockSize;
    this.name = 'InvalidBlockSizeError';
    Object.setPrototypeOf(this, InvalidBlockSizeError.prototype);
  }
}
