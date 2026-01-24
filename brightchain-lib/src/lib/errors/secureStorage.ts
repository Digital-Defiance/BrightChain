import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { SecureStorageErrorType } from '../enumerations/secureStorageErrorType';
import { TypedError } from './typedError';

export class SecureStorageError extends TypedError<SecureStorageErrorType> {
  public get reasonMap(): Record<SecureStorageErrorType, BrightChainStrings> {
    return {
      [SecureStorageErrorType.DecryptedValueChecksumMismatch]:
        BrightChainStrings.Error_SecureStorageDecryptedValueChecksumMismatch,
      [SecureStorageErrorType.DecryptedValueLengthMismatch]:
        BrightChainStrings.Error_SecureStorageDecryptedValueLengthMismatch,
      [SecureStorageErrorType.ValueIsNull]:
        BrightChainStrings.Error_SecureStorageValueIsNull,
    };
  }
  constructor(type: SecureStorageErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'SecureStorageError';
  }
}
