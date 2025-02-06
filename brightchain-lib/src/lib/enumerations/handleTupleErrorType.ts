import { StringNames } from './stringNames';

export enum HandleTupleErrorType {
  InvalidTupleSize = 'InvalidTupleSize',
  BlockSizeMismatch = 'BlockSizeMismatch',
  NoBlocksToXor = 'NoBlocksToXor',
  BlockSizesMustMatch = 'BlockSizesMustMatch',
}

export const HandleTupleErrorTypes: {
  [key in HandleTupleErrorType]: StringNames;
} = {
  [HandleTupleErrorType.InvalidTupleSize]:
    StringNames.Error_HandleTupleErrorInvalidTupleSizeTemplate,
  [HandleTupleErrorType.BlockSizeMismatch]:
    StringNames.Error_HandleTupleErrorBlockSizeMismatch,
  [HandleTupleErrorType.NoBlocksToXor]:
    StringNames.Error_HandleTupleErrorNoBlocksToXor,
  [HandleTupleErrorType.BlockSizesMustMatch]:
    StringNames.Error_HandleTupleErrorBlockSizesMustMatch,
};
