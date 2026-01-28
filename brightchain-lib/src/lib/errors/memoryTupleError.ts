import { LanguageCode } from '@digitaldefiance/i18n-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { MemoryTupleErrorType } from '../enumerations/memoryTupleErrorType';
import { TypedError } from './typedError';

export class MemoryTupleError extends TypedError<MemoryTupleErrorType> {
  public get reasonMap(): Record<MemoryTupleErrorType, BrightChainStrings> {
    return {
      [MemoryTupleErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate,
      [MemoryTupleErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch,
      [MemoryTupleErrorType.NoBlocksToXor]:
        BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor,
      [MemoryTupleErrorType.InvalidBlockCount]:
        BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount,
      [MemoryTupleErrorType.ExpectedBlockIds]:
        BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate,
      [MemoryTupleErrorType.ExpectedBlocks]:
        BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate,
    };
  }
  constructor(
    type: MemoryTupleErrorType,
    tupleSize?: number,
    _language?: LanguageCode,
  ) {
    super(type, undefined, {
      ...(tupleSize ? { TUPLE_SIZE: tupleSize.toString() } : {}),
    });
    this.name = 'MemoryTupleError';
  }
}
