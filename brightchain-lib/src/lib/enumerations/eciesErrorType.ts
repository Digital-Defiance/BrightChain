export enum EciesErrorType {
  InvalidHeaderLength = 'InvalidHeaderLength',
  InvalidEncryptedDataLength = 'InvalidEncryptedDataLength',
  InvalidMnemonic = 'InvalidMnemonic',
  MessageLengthMismatch = 'MessageLengthMismatch',
  InvalidEncryptedKeyLength = 'InvalidEncryptedKeyLength',
  InvalidEphemeralPublicKey = 'InvalidEphemeralPublicKey',
  RecipientNotFound = 'RecipientNotFound',
  InvalidSignature = 'InvalidSignature',
  InvalidSenderPublicKey = 'InvalidSenderPublicKey',
  TooManyRecipients = 'TooManyRecipients',
  PrivateKeyNotLoaded = 'PrivateKeyNotLoaded',
}
