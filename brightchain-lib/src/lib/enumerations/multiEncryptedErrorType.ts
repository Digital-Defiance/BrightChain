export enum MultiEncryptedErrorType {
  DataTooShort = 'DataTooShort',
  DataLengthExceedsCapacity = 'DataLengthExceedsCapacity',
  CreatorMustBeMember = 'CreatorMustBeMember',
  BlockNotReadable = 'BlockNotReadable',
  InvalidEphemeralPublicKeyLength = 'InvalidEphemeralPublicKeyLength',
  InvalidIVLength = 'InvalidIVLength',
  InvalidAuthTagLength = 'InvalidAuthTagLength',
  ChecksumMismatch = 'ChecksumMismatch',
  RecipientMismatch = 'RecipientMismatch',
  RecipientsAlreadyLoaded = 'RecipientsAlreadyLoaded',
}
