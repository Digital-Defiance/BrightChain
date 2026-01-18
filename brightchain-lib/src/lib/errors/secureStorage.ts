import { SecureStorageErrorType } from '../enumerations/secureStorageErrorType';
import { StringNames } from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class SecureStorageError extends TypedError<SecureStorageErrorType> {
  public get reasonMap(): Record<SecureStorageErrorType, StringNames> {
    return {
      [SecureStorageErrorType.DecryptedValueChecksumMismatch]:
        StringNames.Error_SecureStorageDecryptedValueChecksumMismatch,
      [SecureStorageErrorType.DecryptedValueLengthMismatch]:
        StringNames.Error_SecureStorageDecryptedValueLengthMismatch,
      [SecureStorageErrorType.ValueIsNull]:
        StringNames.Error_SecureStorageValueIsNull,
    };
  }
  constructor(type: SecureStorageErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'SecureStorageError';
  }
}
