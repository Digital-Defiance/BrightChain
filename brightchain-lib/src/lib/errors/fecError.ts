import BrightChainStrings from '../enumerations/brightChainStrings';
import { FecErrorType } from '../enumerations/fecErrorType';
import { TypedError } from './typedError';

export class FecError extends TypedError<FecErrorType> {
  public get reasonMap(): Record<FecErrorType, BrightChainStrings> {
    return {
      [FecErrorType.DataRequired]:
        BrightChainStrings.Error_FecErrorDataRequired,
      [FecErrorType.InvalidShardCounts]:
        BrightChainStrings.Error_FecErrorInvalidShardCounts,
      [FecErrorType.InvalidShardsAvailableArray]:
        BrightChainStrings.Error_FecErrorInvalidShardsAvailableArray,
      [FecErrorType.InputBlockRequired]:
        BrightChainStrings.Error_FecErrorInputBlockRequired,
      [FecErrorType.ParityBlockCountMustBePositive]:
        BrightChainStrings.Error_FecErrorParityBlockCountMustBePositive,
      [FecErrorType.InputDataMustBeBuffer]:
        BrightChainStrings.Error_FecErrorInputDataMustBeBuffer,
      [FecErrorType.DamagedBlockRequired]:
        BrightChainStrings.Error_FecErrorDamagedBlockRequired,
      [FecErrorType.ParityBlocksRequired]:
        BrightChainStrings.Error_FecErrorParityBlocksRequired,
      [FecErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_FecErrorBlockSizeMismatch,
      [FecErrorType.DamagedBlockDataMustBeBuffer]:
        BrightChainStrings.Error_FecErrorDamagedBlockDataMustBeBuffer,
      [FecErrorType.ParityBlockDataMustBeBuffer]:
        BrightChainStrings.Error_FecErrorParityBlockDataMustBeBuffer,
      [FecErrorType.InvalidDataLength]:
        BrightChainStrings.Error_FecErrorInvalidDataLengthTemplate,
      [FecErrorType.ShardSizeExceedsMaximum]:
        BrightChainStrings.Error_FecErrorShardSizeExceedsMaximumTemplate,
      [FecErrorType.NotEnoughShardsAvailable]:
        BrightChainStrings.Error_FecErrorNotEnoughShardsAvailableTemplate,
      [FecErrorType.InvalidParityBlockSize]:
        BrightChainStrings.Error_FecErrorInvalidParityBlockSizeTemplate,
      [FecErrorType.InvalidRecoveredBlockSize]:
        BrightChainStrings.Error_FecErrorInvalidRecoveredBlockSizeTemplate,
      [FecErrorType.FecEncodingFailed]:
        BrightChainStrings.Error_FecErrorFecEncodingFailedTemplate,
      [FecErrorType.FecDecodingFailed]:
        BrightChainStrings.Error_FecErrorFecDecodingFailedTemplate,
    };
  }

  constructor(
    type: FecErrorType,
    language?: string,
    templateParams?: Record<string, string>,
  ) {
    super(type, undefined, templateParams);
    this.name = 'FecError';
  }
}
