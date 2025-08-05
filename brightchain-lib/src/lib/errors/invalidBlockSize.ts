import { BlockSize } from '../enumerations/blockSize';
import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class InvalidBlockSizeError extends Error {
  public readonly blockSize: BlockSize;
  constructor(blockSize: BlockSize, language?: StringLanguages) {
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
