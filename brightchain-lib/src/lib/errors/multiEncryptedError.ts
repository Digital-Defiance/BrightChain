import { MultiEncryptedErrorType } from '../enumerations/multiEncryptedErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class MultiEncryptedError extends TypedError<MultiEncryptedErrorType> {
  protected get reasonMap(): Record<MultiEncryptedErrorType, StringNames> {
    return {
      [MultiEncryptedErrorType.DataTooShort]:
        StringNames.Error_MultiEncryptedErrorDataTooShort,
      [MultiEncryptedErrorType.DataLengthExceedsCapacity]:
        StringNames.Error_MultiEncryptedErrorDataLengthExceedsCapacity,
      [MultiEncryptedErrorType.CreatorMustBeMember]:
        StringNames.Error_MultiEncryptedErrorCreatorMustBeMember,
      [MultiEncryptedErrorType.BlockNotReadable]:
        StringNames.Error_MultiEncryptedErrorBlockNotReadable,
      [MultiEncryptedErrorType.InvalidEphemeralPublicKeyLength]:
        StringNames.Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength,
      [MultiEncryptedErrorType.InvalidIVLength]:
        StringNames.Error_MultiEncryptedErrorInvalidIVLength,
      [MultiEncryptedErrorType.InvalidAuthTagLength]:
        StringNames.Error_MultiEncryptedErrorInvalidAuthTagLength,
      [MultiEncryptedErrorType.ChecksumMismatch]:
        StringNames.Error_MultiEncryptedErrorChecksumMismatch,
      [MultiEncryptedErrorType.RecipientMismatch]:
        StringNames.Error_MultiEncryptedErrorRecipientMismatch,
      [MultiEncryptedErrorType.RecipientsAlreadyLoaded]:
        StringNames.Error_MultiEncryptedErrorRecipientsAlreadyLoaded,
    };
  }
  constructor(type: MultiEncryptedErrorType, language?: StringLanguages) {
    super(type, language);
    this.name = 'MultiEncryptedError';
  }
}
