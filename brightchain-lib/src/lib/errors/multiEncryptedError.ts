import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { MultiEncryptedErrorType } from '../enumerations/multiEncryptedErrorType';
import { TypedError } from './typedError';

export class MultiEncryptedError extends TypedError<MultiEncryptedErrorType> {
  protected get reasonMap(): Record<
    MultiEncryptedErrorType,
    BrightChainStringKey
  > {
    return {
      [MultiEncryptedErrorType.DataTooShort]:
        BrightChainStrings.Error_MultiEncryptedError_DataTooShort,
      [MultiEncryptedErrorType.DataLengthExceedsCapacity]:
        BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity,
      [MultiEncryptedErrorType.CreatorMustBeMember]:
        BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember,
      [MultiEncryptedErrorType.BlockNotReadable]:
        BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable,
      [MultiEncryptedErrorType.InvalidEphemeralPublicKeyLength]:
        BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength,
      [MultiEncryptedErrorType.InvalidIVLength]:
        BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength,
      [MultiEncryptedErrorType.InvalidAuthTagLength]:
        BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength,
      [MultiEncryptedErrorType.ChecksumMismatch]:
        BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch,
      [MultiEncryptedErrorType.RecipientMismatch]:
        BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch,
      [MultiEncryptedErrorType.RecipientsAlreadyLoaded]:
        BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded,
    };
  }
  constructor(type: MultiEncryptedErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'MultiEncryptedError';
  }
}
