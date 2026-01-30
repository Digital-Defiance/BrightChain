

import { SuiteCoreStringKey, SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { FecErrorType } from '../enumerations/fecErrorType';
import { TypedError } from './typedError';

export class FecError extends TypedError<FecErrorType, BrightChainStringKey | SuiteCoreStringKeyValue> {
  public get reasonMap(): Record<FecErrorType, BrightChainStringKey | SuiteCoreStringKeyValue> {
    return {
      [FecErrorType.DataRequired]: SuiteCoreStringKey.Error_FecErrorDataRequired,
      [FecErrorType.InvalidShardCounts]: SuiteCoreStringKey.Error_FecErrorInvalidShardCounts,
      [FecErrorType.InvalidShardsAvailableArray]: SuiteCoreStringKey.Error_FecErrorInvalidShardsAvailableArray,
      [FecErrorType.InputBlockRequired]: BrightChainStrings.Error_FecError_InputBlockRequired,
      [FecErrorType.ParityBlockCountMustBePositive]: SuiteCoreStringKey.Error_FecErrorParityDataCountMustBePositive,
      [FecErrorType.InputDataMustBeBuffer]: BrightChainStrings.Error_FecError_InputDataMustBeBuffer,
      [FecErrorType.DamagedBlockRequired]: BrightChainStrings.Error_FecError_DamagedBlockRequired,
      [FecErrorType.ParityBlocksRequired]: BrightChainStrings.Error_FecError_ParityBlocksRequired,
      [FecErrorType.BlockSizeMismatch]: BrightChainStrings.Error_FecError_BlockSizeMismatch,
      [FecErrorType.DamagedBlockDataMustBeBuffer]: BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer,
      [FecErrorType.ParityBlockDataMustBeBuffer]: BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer,
      [FecErrorType.InvalidDataLength]: SuiteCoreStringKey.Error_FecErrorInvalidDataLengthTemplate,
      [FecErrorType.ShardSizeExceedsMaximum]: SuiteCoreStringKey.Error_FecErrorShardSizeExceedsMaximumTemplate,
      [FecErrorType.NotEnoughShardsAvailable]: SuiteCoreStringKey.Error_FecErrorNotEnoughShardsAvailableTemplate,
      [FecErrorType.InvalidParityBlockSize]: BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate,
      [FecErrorType.InvalidRecoveredBlockSize]: BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate,
      [FecErrorType.FecEncodingFailed]: SuiteCoreStringKey.Error_FecErrorFecEncodingFailedTemplate,
      [FecErrorType.FecDecodingFailed]: SuiteCoreStringKey.Error_FecErrorFecDecodingFailedTemplate,
    };
  }

  constructor(
    type: FecErrorType,
    language?: string,
    otherVars?: Record<string, string | number>,
    options?: any
  ) {
    super(type, language, otherVars, options);
    this.name = 'FecError';
  }
}
