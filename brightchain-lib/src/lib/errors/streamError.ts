import { StreamErrorType } from '../enumerations/streamErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class StreamError extends TypedError<StreamErrorType> {
  protected get reasonMap(): Record<StreamErrorType, StringNames> {
    return {
      [StreamErrorType.BlockSizeRequired]:
        StringNames.Error_StreamErrorBlockSizeRequired,
      [StreamErrorType.WhitenedBlockSourceRequired]:
        StringNames.Error_StreamErrorWhitenedBlockSourceRequired,
      [StreamErrorType.RandomBlockSourceRequired]:
        StringNames.Error_StreamErrorRandomBlockSourceRequired,
      [StreamErrorType.InputMustBeBuffer]:
        StringNames.Error_StreamErrorInputMustBeBuffer,
      [StreamErrorType.FailedToGetRandomBlock]:
        StringNames.Error_StreamErrorFailedToGetRandomBlock,
      [StreamErrorType.FailedToGetWhiteningBlock]:
        StringNames.Error_StreamErrorFailedToGetWhiteningBlock,
      [StreamErrorType.IncompleteEncryptedBlock]:
        StringNames.Error_StreamErrorIncompleteEncryptedBlock,
    };
  }

  constructor(
    type: StreamErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(type, language, templateParams);
    this.name = 'StreamError';
  }
}
