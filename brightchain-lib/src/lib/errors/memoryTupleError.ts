import { MemoryTupleErrorType } from '../enumerations/memoryTupleErrorType';
import { StringLanguage } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class MemoryTupleError extends TypedError<MemoryTupleErrorType> {
  public get reasonMap(): Record<MemoryTupleErrorType, StringNames> {
    return {
      [MemoryTupleErrorType.InvalidTupleSize]:
        StringNames.Error_MemoryTupleErrorInvalidTupleSizeTemplate,
      [MemoryTupleErrorType.BlockSizeMismatch]:
        StringNames.Error_MemoryTupleErrorBlockSizeMismatch,
      [MemoryTupleErrorType.NoBlocksToXor]:
        StringNames.Error_MemoryTupleErrorNoBlocksToXor,
      [MemoryTupleErrorType.InvalidBlockCount]:
        StringNames.Error_MemoryTupleErrorInvalidBlockCount,
      [MemoryTupleErrorType.ExpectedBlockIds]:
        StringNames.Error_MemoryTupleErrorExpectedBlockIdsTemplate,
      [MemoryTupleErrorType.ExpectedBlocks]:
        StringNames.Error_MemoryTupleErrorExpectedBlocksTemplate,
    };
  }
  constructor(
    type: MemoryTupleErrorType,
    tupleSize?: number,
    _language?: StringLanguage,
  ) {
    super(type, undefined, {
      ...(tupleSize ? { TUPLE_SIZE: tupleSize.toString() } : {}),
    });
    this.name = 'MemoryTupleError';
  }
}
