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
