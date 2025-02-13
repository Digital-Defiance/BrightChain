export enum BlockErrorType {
  CannotEncrypt = 'CannotEncrypt',
  CannotDecrypt = 'CannotDecrypt',
  CreatorRequired = 'CreatorRequired',
  DataRequired = 'DataRequired',
  DataLengthExceedsCapacity = 'DataLengthExceedsCapacity',
  ActualDataLengthNegative = 'ActualDataLengthNegative',
  ActualDataLengthExceedsDataLength = 'ActualDataLengthExceedsDataLength',
  CreatorPrivateKeyRequired = 'CreatorPrivateKeyRequired',
  CreatorRequiredForEncryption = 'CreatorRequiredForEncryption',
  UnexpectedEncryptedBlockType = 'UnexpectedEncryptedBlockType',
}
