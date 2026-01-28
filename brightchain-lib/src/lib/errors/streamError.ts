import BrightChainStrings from '../enumerations/brightChainStrings';
import { StreamErrorType } from '../enumerations/streamErrorType';
import { TypedError } from './typedError';

export class StreamError extends TypedError<StreamErrorType> {
  protected get reasonMap(): Record<StreamErrorType, BrightChainStrings> {
    return {
      [StreamErrorType.BlockSizeRequired]:
        BrightChainStrings.Error_StreamError_BlockSizeRequired,
      [StreamErrorType.WhitenedBlockSourceRequired]:
        BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired,
      [StreamErrorType.RandomBlockSourceRequired]:
        BrightChainStrings.Error_StreamError_RandomBlockSourceRequired,
      [StreamErrorType.InputMustBeBuffer]:
        BrightChainStrings.Error_StreamError_InputMustBeBuffer,
      [StreamErrorType.FailedToGetRandomBlock]:
        BrightChainStrings.Error_StreamError_FailedToGetRandomBlock,
      [StreamErrorType.FailedToGetWhiteningBlock]:
        BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock,
      [StreamErrorType.IncompleteEncryptedBlock]:
        BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock,
    };
  }

  constructor(
    type: StreamErrorType,
    language?: string,
    templateParams?: Record<string, string>,
  ) {
    super(type, undefined, templateParams);
    this.name = 'StreamError';
  }
}
