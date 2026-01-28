import BrightChainStrings from '../enumerations/brightChainStrings';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TypedError } from './typedError';

export class TupleError extends TypedError<TupleErrorType> {
  public get reasonMap(): Record<TupleErrorType, BrightChainStrings> {
    return {
      [TupleErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_TupleError_InvalidTupleSize,
      [TupleErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_TupleError_BlockSizeMismatch,
      [TupleErrorType.NoBlocksToXor]:
        BrightChainStrings.Error_TupleError_NoBlocksToXor,
      [TupleErrorType.InvalidBlockCount]:
        BrightChainStrings.Error_TupleError_InvalidBlockCount,
      [TupleErrorType.InvalidBlockType]:
        BrightChainStrings.Error_TupleError_InvalidBlockType,
      [TupleErrorType.InvalidSourceLength]:
        BrightChainStrings.Error_TupleError_InvalidSourceLength,
      [TupleErrorType.RandomBlockGenerationFailed]:
        BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed,
      [TupleErrorType.WhiteningBlockGenerationFailed]:
        BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed,
      [TupleErrorType.MissingParameters]:
        BrightChainStrings.Error_TupleError_MissingParameters,
      [TupleErrorType.XorOperationFailed]:
        BrightChainStrings.Error_TupleError_XorOperationFailedTemplate,
      [TupleErrorType.DataStreamProcessingFailed]:
        BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate,
      [TupleErrorType.EncryptedDataStreamProcessingFailed]:
        BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate,
    };
  }
  constructor(
    type: TupleErrorType,
    language?: string,
    params?: { [key: string]: string | number },
  ) {
    super(type, undefined, params);
    this.name = 'TupleError';
  }
}
