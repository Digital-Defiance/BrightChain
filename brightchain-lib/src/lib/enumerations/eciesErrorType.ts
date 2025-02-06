import { StringNames } from './stringNames';

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
}

export const EciesErrorTypes: {
  [key in EciesErrorType]: StringNames;
} = {
  [EciesErrorType.InvalidHeaderLength]:
    StringNames.Error_EciesErrorInvalidHeaderLength,
  [EciesErrorType.InvalidEncryptedDataLength]:
    StringNames.Error_EciesErrorInvalidEncryptedDataLength,
  [EciesErrorType.InvalidMnemonic]: StringNames.Error_EciesErrorInvalidMnemonic,
  [EciesErrorType.MessageLengthMismatch]:
    StringNames.Error_EciesErrorMessageLengthMismatch,
  [EciesErrorType.InvalidEncryptedKeyLength]:
    StringNames.Error_EciesErrorInvalidEncryptedKeyLength,
  [EciesErrorType.InvalidEphemeralPublicKey]:
    StringNames.Error_EciesErrorInvalidEphemeralPublicKey,
  [EciesErrorType.RecipientNotFound]:
    StringNames.Error_EciesErrorRecipientNotFound,
  [EciesErrorType.InvalidSignature]:
    StringNames.Error_EciesErrorInvalidSignature,
  [EciesErrorType.InvalidSenderPublicKey]:
    StringNames.Error_EciesErrorInvalidSenderPublicKey,
  [EciesErrorType.TooManyRecipients]:
    StringNames.Error_EciesErrorTooManyRecipients,
};
