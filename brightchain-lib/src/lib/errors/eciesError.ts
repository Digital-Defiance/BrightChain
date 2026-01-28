import { EciesStringKey } from '@digitaldefiance/ecies-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { TypedError } from './typedError';

export class EciesError extends TypedError<
  EciesErrorType,
  BrightChainStrings | EciesStringKey
> {
  public get reasonMap(): Record<
    EciesErrorType,
    BrightChainStrings | EciesStringKey
  > {
    return {
      [EciesErrorType.InvalidHeaderLength]:
        EciesStringKey.Error_ECIESError_InvalidHeaderLength,
      [EciesErrorType.InvalidEncryptedDataLength]:
        EciesStringKey.Error_ECIESError_InvalidEncryptedDataLength,
      [EciesErrorType.InvalidMnemonic]:
        EciesStringKey.Error_ECIESError_InvalidMnemonic,
      [EciesErrorType.MessageLengthMismatch]:
        EciesStringKey.Error_ECIESError_MessageLengthMismatch,
      [EciesErrorType.InvalidEncryptedKeyLength]:
        EciesStringKey.Error_ECIESError_InvalidEncryptedKeyLength,
      [EciesErrorType.InvalidEphemeralPublicKey]:
        EciesStringKey.Error_ECIESError_InvalidEphemeralPublicKey,
      [EciesErrorType.RecipientNotFound]:
        EciesStringKey.Error_ECIESError_RecipientNotFound,
      [EciesErrorType.InvalidSignature]:
        EciesStringKey.Error_ECIESError_InvalidSignature,
      [EciesErrorType.InvalidSenderPublicKey]:
        EciesStringKey.Error_ECIESError_InvalidSenderPublicKey,
      [EciesErrorType.TooManyRecipients]:
        EciesStringKey.Error_ECIESError_TooManyRecipients,
      [EciesErrorType.PrivateKeyNotLoaded]:
        EciesStringKey.Error_ECIESError_PrivateKeyNotLoaded,
      [EciesErrorType.RecipientKeyCountMismatch]:
        EciesStringKey.Error_ECIESError_RecipientKeyCountMismatch,
      [EciesErrorType.InvalidIVLength]:
        EciesStringKey.Error_ECIESError_InvalidIVLength,
      [EciesErrorType.InvalidAuthTagLength]:
        EciesStringKey.Error_ECIESError_InvalidAuthTagLength,
      [EciesErrorType.FileSizeTooLarge]:
        EciesStringKey.Error_ECIESError_FileSizeTooLarge,
      [EciesErrorType.InvalidDataLength]:
        EciesStringKey.Error_ECIESError_InvalidDataLength,
      [EciesErrorType.InvalidRecipientCount]:
        EciesStringKey.Error_ECIESError_InvalidRecipientCount,
      [EciesErrorType.InvalidBlockType]:
        BrightChainStrings.Error_EciesError_InvalidBlockType,
      [EciesErrorType.InvalidMessageCrc]:
        EciesStringKey.Error_ECIESError_InvalidMessageCrc,
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
