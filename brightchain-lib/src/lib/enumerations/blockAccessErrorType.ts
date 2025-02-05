import { StringNames } from './stringNames';

/**
 * Error types for BlockAccessError
 */
export enum BlockAccessErrorType {
  BlockAlreadyExists = 'BlockAlreadyExists',
  BlockFileNotFound = 'BlockFileNotFound',
  BlockIsNotPersistable = 'BlockIsNotPersistable',
  BlockIsNotReadable = 'BlockIsNotReadable',
  CBLCannotBeEncrypted = 'CBLCannotBeEncrypted',
  CreatorMustBeProvided = 'CreatorMustBeProvided',
}

/**
 * Maps BlockAccessErrorType to StringNames
 */
export const BlockAccessErrorTypes: {
  [key in BlockAccessErrorType]: StringNames;
} = {
  [BlockAccessErrorType.BlockAlreadyExists]:
    StringNames.Error_BlockAccessErrorBlockAlreadyExists,
  [BlockAccessErrorType.BlockFileNotFound]:
    StringNames.Error_BlockAccessErrorBlockFileNotFoundTemplate,
  [BlockAccessErrorType.BlockIsNotPersistable]:
    StringNames.Error_BlockAccessErrorBlockIsNotPersistable,
  [BlockAccessErrorType.BlockIsNotReadable]:
    StringNames.Error_BlockAccessErrorBlockIsNotReadable,
  [BlockAccessErrorType.CBLCannotBeEncrypted]:
    StringNames.Error_BlockAccessCBLCannotBeEncrypted,
  [BlockAccessErrorType.CreatorMustBeProvided]:
    StringNames.Error_BlockAccessErrorCreatorMustBeProvided,
};
