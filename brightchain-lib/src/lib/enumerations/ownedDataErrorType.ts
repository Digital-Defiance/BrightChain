export enum OwnedDataErrorType {
  CreatorRequired = 'CreatorRequired',
  DataRequired = 'DataRequired',
  DataLengthExceedsCapacity = 'DataLengthExceedsCapacity',
  ActualDataLengthNegative = 'ActualDataLengthNegative',
  ActualDataLengthExceedsDataLength = 'ActualDataLengthExceedsDataLength',
  CreatorRequiredForEncryption = 'CreatorRequiredForEncryption',
  UnexpectedEncryptedBlockType = 'UnexpectedEncryptedBlockType',
}
