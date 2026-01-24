import BrightChainStrings from '../enumerations/brightChainStrings';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { TypedError } from './typedError';

export class EciesError extends TypedError<EciesErrorType> {
  public get reasonMap(): Record<EciesErrorType, BrightChainStrings> {
    return {
      [EciesErrorType.InvalidHeaderLength]:
        BrightChainStrings.Error_EciesErrorInvalidHeaderLength,
      [EciesErrorType.InvalidEncryptedDataLength]:
        BrightChainStrings.Error_EciesErrorInvalidEncryptedDataLength,
      [EciesErrorType.InvalidMnemonic]:
        BrightChainStrings.Error_EciesErrorInvalidMnemonic,
      [EciesErrorType.MessageLengthMismatch]:
        BrightChainStrings.Error_EciesErrorMessageLengthMismatch,
      [EciesErrorType.InvalidEncryptedKeyLength]:
        BrightChainStrings.Error_EciesErrorInvalidEncryptedKeyLength,
      [EciesErrorType.InvalidEphemeralPublicKey]:
        BrightChainStrings.Error_EciesErrorInvalidEphemeralPublicKey,
      [EciesErrorType.RecipientNotFound]:
        BrightChainStrings.Error_EciesErrorRecipientNotFound,
      [EciesErrorType.InvalidSignature]:
        BrightChainStrings.Error_EciesErrorInvalidSignature,
      [EciesErrorType.InvalidSenderPublicKey]:
        BrightChainStrings.Error_EciesErrorInvalidSenderPublicKey,
      [EciesErrorType.TooManyRecipients]:
        BrightChainStrings.Error_EciesErrorTooManyRecipients,
      [EciesErrorType.PrivateKeyNotLoaded]:
        BrightChainStrings.Error_EciesErrorPrivateKeyNotLoaded,
      [EciesErrorType.RecipientKeyCountMismatch]:
        BrightChainStrings.Error_EciesErrorRecipientKeyCountMismatch,
      [EciesErrorType.InvalidIVLength]:
        BrightChainStrings.Error_EciesErrorInvalidIVLength,
      [EciesErrorType.InvalidAuthTagLength]:
        BrightChainStrings.Error_EciesErrorInvalidAuthTagLength,
      [EciesErrorType.FileSizeTooLarge]:
        BrightChainStrings.Error_EciesErrorFileSizeTooLarge,
      [EciesErrorType.InvalidDataLength]:
        BrightChainStrings.Error_EciesErrorInvalidDataLength,
      [EciesErrorType.InvalidRecipientCount]:
        BrightChainStrings.Error_EciesErrorInvalidRecipientCount,
      [EciesErrorType.InvalidBlockType]:
        BrightChainStrings.Error_EciesErrorInvalidBlockType,
      [EciesErrorType.InvalidMessageCrc]:
        BrightChainStrings.Error_EciesErrorInvalidMessageCrc,
    };
  }

  constructor(
    type: EciesErrorType,
    language?: string,
    templateParams?: Record<string, string>,
  ) {
    super(type, undefined, templateParams);
    this.name = 'EciesError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, EciesError.prototype);
  }
}
