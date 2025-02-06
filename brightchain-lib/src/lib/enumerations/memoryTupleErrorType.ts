import { StringNames } from './stringNames';

export enum MemoryTupleErrorType {
  InvalidTupleSize = 'InvalidTupleSize',
  BlockSizeMismatch = 'BlockSizeMismatch',
  NoBlocksToXor = 'NoBlocksToXor',
  InvalidBlockCount = 'InvalidBlockCount',
  ExpectedBlockIds = 'ExpectedBlockIds',
  ExpectedBlocks = 'ExpectedBlocks',
}

export const MemoryTupleErrorTypes: {
  [key in MemoryTupleErrorType]: StringNames;
} = {
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
