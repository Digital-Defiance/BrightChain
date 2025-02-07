import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class InvalidBlockSizeLengthError extends Error {
  public readonly blockSize: number;
  constructor(blockSize: number, language?: StringLanguages) {
    super(
      translate(StringNames.Error_InvalidBlockSizeTemplate, language, {
        BLOCK_SIZE: blockSize,
      }),
    );
    this.blockSize = blockSize;
    this.name = 'InvalidBlockSizeLengthError';
    Object.setPrototypeOf(this, InvalidBlockSizeLengthError.prototype);
  }
}
