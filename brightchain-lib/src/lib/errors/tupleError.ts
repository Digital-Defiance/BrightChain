import BrightChainStrings from '../enumerations/brightChainStrings';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TypedError } from './typedError';

export class TupleError extends TypedError<TupleErrorType> {
  public get reasonMap(): Record<TupleErrorType, BrightChainStrings> {
    return {
      [TupleErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_TupleErrorInvalidTupleSize,
      [TupleErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_TupleErrorBlockSizeMismatch,
      [TupleErrorType.NoBlocksToXor]: BrightChainStrings.Error_TupleErrorNoBlocksToXor,
      [TupleErrorType.InvalidBlockCount]:
        BrightChainStrings.Error_TupleErrorInvalidBlockCount,
      [TupleErrorType.InvalidBlockType]:
        BrightChainStrings.Error_TupleErrorInvalidBlockType,
      [TupleErrorType.InvalidSourceLength]:
        BrightChainStrings.Error_TupleErrorInvalidSourceLength,
      [TupleErrorType.RandomBlockGenerationFailed]:
        BrightChainStrings.Error_TupleErrorRandomBlockGenerationFailed,
      [TupleErrorType.WhiteningBlockGenerationFailed]:
        BrightChainStrings.Error_TupleErrorWhiteningBlockGenerationFailed,
      [TupleErrorType.MissingParameters]:
        BrightChainStrings.Error_TupleErrorMissingParameters,
      [TupleErrorType.XorOperationFailed]:
        BrightChainStrings.Error_TupleErrorXorOperationFailedTemplate,
      [TupleErrorType.DataStreamProcessingFailed]:
        BrightChainStrings.Error_TupleErrorDataStreamProcessingFailedTemplate,
      [TupleErrorType.EncryptedDataStreamProcessingFailed]:
        BrightChainStrings.Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate,
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
