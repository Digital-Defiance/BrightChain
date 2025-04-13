import { SecureStorageErrorType } from '../enumerations/secureStorageErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class SecureStorageError extends TypedError<SecureStorageErrorType> {
  public get reasonMap(): Record<SecureStorageErrorType, StringNames> {
    return {
      [SecureStorageErrorType.DecryptedValueChecksumMismatch]:
        StringNames.Error_SecureStorageDecryptedValueChecksumMismatch,
      [SecureStorageErrorType.DecryptedValueLengthMismatch]:
        StringNames.Error_SecureStorageDecryptedValueLengthMismatch,
    };
  }
  constructor(type: SecureStorageErrorType, language?: StringLanguages) {
    super(type, language);
    this.name = 'SecureStorageError';
  }
}
