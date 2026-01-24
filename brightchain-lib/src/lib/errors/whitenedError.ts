import BrightChainStrings from '../enumerations/brightChainStrings';
import { WhitenedErrorType } from '../enumerations/whitenedErrorType';
import { TypedError } from './typedError';

export class WhitenedError extends TypedError<WhitenedErrorType> {
  public get reasonMap(): Record<WhitenedErrorType, BrightChainStrings> {
    return {
      [WhitenedErrorType.BlockNotReadable]:
        BrightChainStrings.Error_WhitenedErrorBlockNotReadable,
      [WhitenedErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_WhitenedErrorBlockSizeMismatch,
      [WhitenedErrorType.DataLengthMismatch]:
        BrightChainStrings.Error_WhitenedErrorDataLengthMismatch,
      [WhitenedErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_WhitenedErrorInvalidBlockSize,
    };
  }
  constructor(type: WhitenedErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'WhitenedError';
  }
}
