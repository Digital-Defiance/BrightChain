import BrightChainStrings from '../enumerations/brightChainStrings';
import { MultiEncryptedErrorType } from '../enumerations/multiEncryptedErrorType';
import { TypedError } from './typedError';

export class MultiEncryptedError extends TypedError<MultiEncryptedErrorType> {
  protected get reasonMap(): Record<
    MultiEncryptedErrorType,
    BrightChainStrings
  > {
    return {
      [MultiEncryptedErrorType.DataTooShort]:
        BrightChainStrings.Error_MultiEncryptedErrorDataTooShort,
      [MultiEncryptedErrorType.DataLengthExceedsCapacity]:
        BrightChainStrings.Error_MultiEncryptedErrorDataLengthExceedsCapacity,
      [MultiEncryptedErrorType.CreatorMustBeMember]:
        BrightChainStrings.Error_MultiEncryptedErrorCreatorMustBeMember,
      [MultiEncryptedErrorType.BlockNotReadable]:
        BrightChainStrings.Error_MultiEncryptedErrorBlockNotReadable,
      [MultiEncryptedErrorType.InvalidEphemeralPublicKeyLength]:
        BrightChainStrings.Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength,
      [MultiEncryptedErrorType.InvalidIVLength]:
        BrightChainStrings.Error_MultiEncryptedErrorInvalidIVLength,
      [MultiEncryptedErrorType.InvalidAuthTagLength]:
        BrightChainStrings.Error_MultiEncryptedErrorInvalidAuthTagLength,
      [MultiEncryptedErrorType.ChecksumMismatch]:
        BrightChainStrings.Error_MultiEncryptedErrorChecksumMismatch,
      [MultiEncryptedErrorType.RecipientMismatch]:
        BrightChainStrings.Error_MultiEncryptedErrorRecipientMismatch,
      [MultiEncryptedErrorType.RecipientsAlreadyLoaded]:
        BrightChainStrings.Error_MultiEncryptedErrorRecipientsAlreadyLoaded,
    };
  }
  constructor(type: MultiEncryptedErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'MultiEncryptedError';
  }
}
