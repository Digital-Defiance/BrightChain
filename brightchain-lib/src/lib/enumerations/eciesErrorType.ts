export enum EciesErrorType {
  InvalidIVLength = 'InvalidIVLength',
  InvalidAuthTagLength = 'InvalidAuthTagLength',
  InvalidBlockType = 'InvalidBlockType',
  InvalidHeaderLength = 'InvalidHeaderLength',
  InvalidDataLength = 'InvalidDataLength',
  InvalidEncryptedDataLength = 'InvalidEncryptedDataLength',
  InvalidMessageCrc = 'InvalidMessageCrc',
  InvalidMnemonic = 'InvalidMnemonic',
  MessageLengthMismatch = 'MessageLengthMismatch',
  InvalidEncryptedKeyLength = 'InvalidEncryptedKeyLength',
  InvalidEphemeralPublicKey = 'InvalidEphemeralPublicKey',
  RecipientNotFound = 'RecipientNotFound',
  InvalidSignature = 'InvalidSignature',
  InvalidSenderPublicKey = 'InvalidSenderPublicKey',
  TooManyRecipients = 'TooManyRecipients',
  PrivateKeyNotLoaded = 'PrivateKeyNotLoaded',
  RecipientKeyCountMismatch = 'RecipientKeyCountMismatch',
  InvalidRecipientCount = 'InvalidRecipientCount',
  FileSizeTooLarge = 'FileSizeTooLarge',
  DecryptionFailed = 'DecryptionFailed', // Added for MAC/Padding errors
  InvalidRecipientPublicKey = 'InvalidRecipientPublicKey', // Added for specific key errors
  SecretComputationFailed = 'SecretComputationFailed', // Added for ECDH failures
}
