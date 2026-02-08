import { LanguageCode } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { HandleTupleErrorType } from '../enumerations/handleTupleErrorType';
import { TypedError } from './typedError';

export class HandleTupleError extends TypedError<HandleTupleErrorType> {
  public get reasonMap(): Record<HandleTupleErrorType, BrightChainStringKey> {
    return {
      [HandleTupleErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate,
      [HandleTupleErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch,
      [HandleTupleErrorType.NoBlocksToXor]:
        BrightChainStrings.Error_HandleTupleError_NoBlocksToXor,
      [HandleTupleErrorType.BlockSizesMustMatch]:
        BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch,
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
