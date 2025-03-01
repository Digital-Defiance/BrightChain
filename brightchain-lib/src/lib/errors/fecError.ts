import { FecErrorType } from '../enumerations/fecErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class FecError extends TypedError<FecErrorType> {
  public get reasonMap(): Record<FecErrorType, StringNames> {
    return {
      [FecErrorType.DataRequired]: StringNames.Error_FecErrorDataRequired,
      [FecErrorType.InvalidShardCounts]:
        StringNames.Error_FecErrorInvalidShardCounts,
      [FecErrorType.InvalidShardsAvailableArray]:
        StringNames.Error_FecErrorInvalidShardsAvailableArray,
      [FecErrorType.InputBlockRequired]:
        StringNames.Error_FecErrorInputBlockRequired,
      [FecErrorType.ParityBlockCountMustBePositive]:
        StringNames.Error_FecErrorParityBlockCountMustBePositive,
      [FecErrorType.InputDataMustBeBuffer]:
        StringNames.Error_FecErrorInputDataMustBeBuffer,
      [FecErrorType.DamagedBlockRequired]:
        StringNames.Error_FecErrorDamagedBlockRequired,
      [FecErrorType.ParityBlocksRequired]:
        StringNames.Error_FecErrorParityBlocksRequired,
      [FecErrorType.BlockSizeMismatch]:
        StringNames.Error_FecErrorBlockSizeMismatch,
      [FecErrorType.DamagedBlockDataMustBeBuffer]:
        StringNames.Error_FecErrorDamagedBlockDataMustBeBuffer,
      [FecErrorType.ParityBlockDataMustBeBuffer]:
        StringNames.Error_FecErrorParityBlockDataMustBeBuffer,
      [FecErrorType.InvalidDataLength]:
        StringNames.Error_FecErrorInvalidDataLengthTemplate,
      [FecErrorType.ShardSizeExceedsMaximum]:
        StringNames.Error_FecErrorShardSizeExceedsMaximumTemplate,
      [FecErrorType.NotEnoughShardsAvailable]:
        StringNames.Error_FecErrorNotEnoughShardsAvailableTemplate,
      [FecErrorType.InvalidParityBlockSize]:
        StringNames.Error_FecErrorInvalidParityBlockSizeTemplate,
      [FecErrorType.InvalidRecoveredBlockSize]:
        StringNames.Error_FecErrorInvalidRecoveredBlockSizeTemplate,
      [FecErrorType.FecEncodingFailed]:
        StringNames.Error_FecErrorFecEncodingFailedTemplate,
      [FecErrorType.FecDecodingFailed]:
        StringNames.Error_FecErrorFecDecodingFailedTemplate,
    };
  }

  constructor(
    type: FecErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(type, language, templateParams);
    this.name = 'FecError';
  }
}
