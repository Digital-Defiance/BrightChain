import { LanguageCode } from '@digitaldefiance/i18n-lib';
import { MemoryTupleErrorType } from '../enumerations/memoryTupleErrorType';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class MemoryTupleError extends TypedError<MemoryTupleErrorType> {
  public get reasonMap(): Record<MemoryTupleErrorType, BrightChainStrings> {
    return {
      [MemoryTupleErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_MemoryTupleErrorInvalidTupleSizeTemplate,
      [MemoryTupleErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_MemoryTupleErrorBlockSizeMismatch,
      [MemoryTupleErrorType.NoBlocksToXor]:
        BrightChainStrings.Error_MemoryTupleErrorNoBlocksToXor,
      [MemoryTupleErrorType.InvalidBlockCount]:
        BrightChainStrings.Error_MemoryTupleErrorInvalidBlockCount,
      [MemoryTupleErrorType.ExpectedBlockIds]:
        BrightChainStrings.Error_MemoryTupleErrorExpectedBlockIdsTemplate,
      [MemoryTupleErrorType.ExpectedBlocks]:
        BrightChainStrings.Error_MemoryTupleErrorExpectedBlocksTemplate,
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
