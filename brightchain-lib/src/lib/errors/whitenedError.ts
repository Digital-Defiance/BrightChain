import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { WhitenedErrorType } from '../enumerations/whitenedErrorType';
import { TypedError } from './typedError';

export class WhitenedError extends TypedError<WhitenedErrorType> {
  public get reasonMap(): Record<WhitenedErrorType, BrightChainStringKey> {
    return {
      [WhitenedErrorType.BlockNotReadable]:
        BrightChainStrings.Error_WhitenedError_BlockNotReadable,
      [WhitenedErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_WhitenedError_BlockSizeMismatch,
      [WhitenedErrorType.DataLengthMismatch]:
        BrightChainStrings.Error_WhitenedError_DataLengthMismatch,
      [WhitenedErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_WhitenedError_InvalidBlockSize,
    };
  }
  constructor(type: WhitenedErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'WhitenedError';
  }
}
