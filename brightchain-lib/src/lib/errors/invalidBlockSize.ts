import { BlockSize } from '../enumerations/blockSize';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class InvalidBlockSizeError extends Error {
  public readonly blockSize: BlockSize;
  constructor(blockSize: BlockSize, _language?: string) {
    super(
      translate(StringNames.Error_InvalidBlockSizeTemplate, {
        BLOCK_SIZE: blockSize as number,
      }),
    );
    this.blockSize = blockSize;
    this.name = 'InvalidBlockSizeError';
    Object.setPrototypeOf(this, InvalidBlockSizeError.prototype);
  }
}
