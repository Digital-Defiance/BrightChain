export enum BlockServiceErrorType {
  EmptyBlocksArray = 'EmptyBlocksArray',
  BlockSizeMismatch = 'BlockSizeMismatch',
  NoWhitenersProvided = 'NoWhitenersProvided',
  AlreadyInitialized = 'AlreadyInitialized',
  Uninitialized = 'Uninitialized',
  BlockAlreadyExists = 'BlockAlreadyExists',
  RecipientRequiredForEncryption = 'RecipientRequiredForEncryption',
  CannotDetermineBlockSize = 'CannotDetermineBlockSize',
  CannotDetermineFileName = 'CannotDetermineFileName',
  CannotDetermineLength = 'CannotDetermineLength',
  CannotDetermineMimeType = 'CannotDetermineMimeType',
  FilePathNotProvided = 'FilePathNotProvided',
}
