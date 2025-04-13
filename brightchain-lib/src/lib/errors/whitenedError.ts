import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { WhitenedErrorType } from '../enumerations/whitenedErrorType';
import { TypedError } from './typedError';

export class WhitenedError extends TypedError<WhitenedErrorType> {
  public get reasonMap(): Record<WhitenedErrorType, StringNames> {
    return {
      [WhitenedErrorType.BlockNotReadable]:
        StringNames.Error_WhitenedErrorBlockNotReadable,
      [WhitenedErrorType.BlockSizeMismatch]:
        StringNames.Error_WhitenedErrorBlockSizeMismatch,
      [WhitenedErrorType.DataLengthMismatch]:
        StringNames.Error_WhitenedErrorDataLengthMismatch,
      [WhitenedErrorType.InvalidBlockSize]:
        StringNames.Error_WhitenedErrorInvalidBlockSize,
    };
  }
  constructor(type: WhitenedErrorType, _language?: StringLanguages) {
    super(type, undefined);
    this.name = 'WhitenedError';
  }
}
