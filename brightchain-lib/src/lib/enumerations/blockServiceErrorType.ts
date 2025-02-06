import { StringNames } from './stringNames';

export enum BlockServiceErrorType {
  EmptyBlocksArray = 'EmptyBlocksArray',
  BlockSizeMismatch = 'BlockSizeMismatch',
  NoWhitenersProvided = 'NoWhitenersProvided',
}

export const BlockServiceErrorTypes: {
  [key in BlockServiceErrorType]: StringNames;
} = {
  [BlockServiceErrorType.EmptyBlocksArray]:
    StringNames.Error_BlockServiceErrorEmptyBlocksArray,
  [BlockServiceErrorType.BlockSizeMismatch]:
    StringNames.Error_BlockServiceErrorBlockSizeMismatch,
  [BlockServiceErrorType.NoWhitenersProvided]:
    StringNames.Error_BlockServiceErrorNoWhitenersProvided,
};
