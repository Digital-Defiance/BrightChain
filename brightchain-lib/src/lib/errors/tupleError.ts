import StringNames from '../enumerations/stringNames';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TypedError } from './typedError';

export class TupleError extends TypedError<TupleErrorType> {
  public get reasonMap(): Record<TupleErrorType, StringNames> {
    return {
      [TupleErrorType.InvalidTupleSize]:
        StringNames.Error_TupleErrorInvalidTupleSize,
      [TupleErrorType.BlockSizeMismatch]:
        StringNames.Error_TupleErrorBlockSizeMismatch,
      [TupleErrorType.NoBlocksToXor]: StringNames.Error_TupleErrorNoBlocksToXor,
      [TupleErrorType.InvalidBlockCount]:
        StringNames.Error_TupleErrorInvalidBlockCount,
      [TupleErrorType.InvalidBlockType]:
        StringNames.Error_TupleErrorInvalidBlockType,
      [TupleErrorType.InvalidSourceLength]:
        StringNames.Error_TupleErrorInvalidSourceLength,
      [TupleErrorType.RandomBlockGenerationFailed]:
        StringNames.Error_TupleErrorRandomBlockGenerationFailed,
      [TupleErrorType.WhiteningBlockGenerationFailed]:
        StringNames.Error_TupleErrorWhiteningBlockGenerationFailed,
      [TupleErrorType.MissingParameters]:
        StringNames.Error_TupleErrorMissingParameters,
      [TupleErrorType.XorOperationFailed]:
        StringNames.Error_TupleErrorXorOperationFailedTemplate,
      [TupleErrorType.DataStreamProcessingFailed]:
        StringNames.Error_TupleErrorDataStreamProcessingFailedTemplate,
      [TupleErrorType.EncryptedDataStreamProcessingFailed]:
        StringNames.Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate,
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
