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
      [EciesErrorType.RecipientKeyCountMismatch]:
        StringNames.Error_EciesErrorRecipientKeyCountMismatch,
      [EciesErrorType.InvalidIVLength]:
        StringNames.Error_EciesErrorInvalidIVLength,
      [EciesErrorType.InvalidAuthTagLength]:
        StringNames.Error_EciesErrorInvalidAuthTagLength,
      [EciesErrorType.FileSizeTooLarge]:
        StringNames.Error_EciesErrorFileSizeTooLarge,
      [EciesErrorType.InvalidDataLength]:
        StringNames.Error_EciesErrorInvalidDataLength,
      [EciesErrorType.InvalidRecipientCount]:
        StringNames.Error_EciesErrorInvalidRecipientCount,
      [EciesErrorType.InvalidBlockType]:
        StringNames.Error_EciesErrorInvalidBlockType,
      [EciesErrorType.InvalidMessageCrc]:
        StringNames.Error_EciesErrorInvalidMessageCrc,
      // Added mapping
      [EciesErrorType.DecryptionFailed]:
        StringNames.Error_EciesErrorDecryptionFailed, // Added mapping
      [EciesErrorType.InvalidRecipientPublicKey]:
        StringNames.Error_EciesErrorInvalidRecipientPublicKey, // Added mapping
      [EciesErrorType.SecretComputationFailed]:
        StringNames.Error_EciesErrorSecretComputationFailed, // Added mapping
    };
  }

  constructor(
    type: EciesErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(type, language, templateParams);
    this.name = 'EciesError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, EciesError.prototype);
  }
}
