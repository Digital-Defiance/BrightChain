import { EciesErrorType } from '../enumerations/eciesErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class EciesError extends TypedError<EciesErrorType> {
  public get reasonMap(): Record<EciesErrorType, StringNames> {
    return {
      [EciesErrorType.InvalidHeaderLength]:
        StringNames.Error_EciesErrorInvalidHeaderLength,
      [EciesErrorType.InvalidEncryptedDataLength]:
        StringNames.Error_EciesErrorInvalidEncryptedDataLength,
      [EciesErrorType.InvalidMnemonic]:
        StringNames.Error_EciesErrorInvalidMnemonic,
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
      [EciesErrorType.PrivateKeyNotLoaded]:
        StringNames.Error_EciesErrorPrivateKeyNotLoaded,
    };
  }

  constructor(
    type: EciesErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(type, language, templateParams);
    this.name = 'EciesError';
  }
}
