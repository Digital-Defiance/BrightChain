import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { FecErrorType } from '../enumerations/fecErrorType';
import { TypedError } from './typedError';

export class FecError extends TypedError<
  FecErrorType,
  BrightChainStrings | SuiteCoreStringKey
> {
  public get reasonMap(): Record<
    FecErrorType,
    BrightChainStrings | SuiteCoreStringKey
  > {
    return {
      [FecErrorType.DataRequired]:
        SuiteCoreStringKey.Error_FecErrorDataRequired,
      [FecErrorType.InvalidShardCounts]:
        SuiteCoreStringKey.Error_FecErrorInvalidShardCounts,
      [FecErrorType.InvalidShardsAvailableArray]:
        SuiteCoreStringKey.Error_FecErrorInvalidShardsAvailableArray,
      [FecErrorType.InputBlockRequired]:
        BrightChainStrings.Error_FecError_InputBlockRequired,
      [FecErrorType.ParityBlockCountMustBePositive]:
        SuiteCoreStringKey.Error_FecErrorParityDataCountMustBePositive,
      [FecErrorType.InputDataMustBeBuffer]:
        BrightChainStrings.Error_FecError_InputDataMustBeBuffer,
      [FecErrorType.DamagedBlockRequired]:
        BrightChainStrings.Error_FecError_DamagedBlockRequired,
      [FecErrorType.ParityBlocksRequired]:
        BrightChainStrings.Error_FecError_ParityBlocksRequired,
      [FecErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_FecError_BlockSizeMismatch,
      [FecErrorType.DamagedBlockDataMustBeBuffer]:
        BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer,
      [FecErrorType.ParityBlockDataMustBeBuffer]:
        BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer,
      [FecErrorType.InvalidDataLength]:
        SuiteCoreStringKey.Error_FecErrorInvalidDataLengthTemplate,
      [FecErrorType.ShardSizeExceedsMaximum]:
        SuiteCoreStringKey.Error_FecErrorShardSizeExceedsMaximumTemplate,
      [FecErrorType.NotEnoughShardsAvailable]:
        SuiteCoreStringKey.Error_FecErrorNotEnoughShardsAvailableTemplate,
      [FecErrorType.InvalidParityBlockSize]:
        BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate,
      [FecErrorType.InvalidRecoveredBlockSize]:
        BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate,
      [FecErrorType.FecEncodingFailed]:
        SuiteCoreStringKey.Error_FecErrorFecEncodingFailedTemplate,
      [FecErrorType.FecDecodingFailed]:
        SuiteCoreStringKey.Error_FecErrorFecDecodingFailedTemplate,
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
