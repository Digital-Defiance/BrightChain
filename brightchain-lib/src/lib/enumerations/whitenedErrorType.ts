import { StringNames } from './stringNames';

export enum WhitenedErrorType {
  BlockNotReadable = 'BlockNotReadable',
  BlockSizeMismatch = 'BlockSizeMismatch',
  DataLengthMismatch = 'DataLengthMismatch',
  InvalidBlockSize = 'InvalidBlockSize',
}

export const WhitenedErrorTypes: {
  [key in WhitenedErrorType]: StringNames;
} = {
  [WhitenedErrorType.BlockNotReadable]:
    StringNames.Error_WhitenedErrorBlockNotReadable,
  [WhitenedErrorType.BlockSizeMismatch]:
    StringNames.Error_WhitenedErrorBlockSizeMismatch,
  [WhitenedErrorType.DataLengthMismatch]:
    StringNames.Error_WhitenedErrorDataLengthMismatch,
  [WhitenedErrorType.InvalidBlockSize]:
    StringNames.Error_WhitenedErrorInvalidBlockSize,
};
