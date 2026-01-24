import BrightChainStrings from '../enumerations/brightChainStrings';
import { StreamErrorType } from '../enumerations/streamErrorType';
import { TypedError } from './typedError';

export class StreamError extends TypedError<StreamErrorType> {
  protected get reasonMap(): Record<StreamErrorType, BrightChainStrings> {
    return {
      [StreamErrorType.BlockSizeRequired]:
        BrightChainStrings.Error_StreamErrorBlockSizeRequired,
      [StreamErrorType.WhitenedBlockSourceRequired]:
        BrightChainStrings.Error_StreamErrorWhitenedBlockSourceRequired,
      [StreamErrorType.RandomBlockSourceRequired]:
        BrightChainStrings.Error_StreamErrorRandomBlockSourceRequired,
      [StreamErrorType.InputMustBeBuffer]:
        BrightChainStrings.Error_StreamErrorInputMustBeBuffer,
      [StreamErrorType.FailedToGetRandomBlock]:
        BrightChainStrings.Error_StreamErrorFailedToGetRandomBlock,
      [StreamErrorType.FailedToGetWhiteningBlock]:
        BrightChainStrings.Error_StreamErrorFailedToGetWhiteningBlock,
      [StreamErrorType.IncompleteEncryptedBlock]:
        BrightChainStrings.Error_StreamErrorIncompleteEncryptedBlock,
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
