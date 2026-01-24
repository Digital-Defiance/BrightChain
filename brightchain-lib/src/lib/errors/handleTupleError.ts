import { LanguageCode } from '@digitaldefiance/i18n-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { HandleTupleErrorType } from '../enumerations/handleTupleErrorType';
import { TypedError } from './typedError';

export class HandleTupleError extends TypedError<HandleTupleErrorType> {
  public get reasonMap(): Record<HandleTupleErrorType, BrightChainStrings> {
    return {
      [HandleTupleErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_HandleTupleErrorInvalidTupleSizeTemplate,
      [HandleTupleErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_HandleTupleErrorBlockSizeMismatch,
      [HandleTupleErrorType.NoBlocksToXor]:
        BrightChainStrings.Error_HandleTupleErrorNoBlocksToXor,
      [HandleTupleErrorType.BlockSizesMustMatch]:
        BrightChainStrings.Error_HandleTupleErrorBlockSizesMustMatch,
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
