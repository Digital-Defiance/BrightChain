import { LanguageCode } from '@digitaldefiance/i18n-lib';
import { HandleTupleErrorType } from '../enumerations/handleTupleErrorType';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class HandleTupleError extends TypedError<HandleTupleErrorType> {
  public get reasonMap(): Record<HandleTupleErrorType, StringNames> {
    return {
      [HandleTupleErrorType.InvalidTupleSize]:
        StringNames.Error_HandleTupleErrorInvalidTupleSizeTemplate,
      [HandleTupleErrorType.BlockSizeMismatch]:
        StringNames.Error_HandleTupleErrorBlockSizeMismatch,
      [HandleTupleErrorType.NoBlocksToXor]:
        StringNames.Error_HandleTupleErrorNoBlocksToXor,
      [HandleTupleErrorType.BlockSizesMustMatch]:
        StringNames.Error_HandleTupleErrorBlockSizesMustMatch,
    };
  }
  public readonly tupleSize?: number;
  constructor(
    type: HandleTupleErrorType,
    tupleSize?: number,
    _language?: LanguageCode,
  ) {
    super(type, undefined, {
      ...(tupleSize ? { TUPLE_SIZE: tupleSize.toString() } : {}),
    });
    this.name = 'HandleTupleError';
    this.tupleSize = tupleSize;
  }
}
