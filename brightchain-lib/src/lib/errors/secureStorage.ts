import { EciesStringKey } from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { SecureStorageErrorType } from '../enumerations/secureStorageErrorType';
import { TypedError } from './typedError';

export class SecureStorageError extends TypedError<
  SecureStorageErrorType,
  BrightChainStrings | EciesStringKey
> {
  public get reasonMap(): Record<
    SecureStorageErrorType,
    BrightChainStrings | EciesStringKey
  > {
    return {
      [SecureStorageErrorType.DecryptedValueChecksumMismatch]:
        EciesStringKey.Error_SecureStorageError_DecryptedValueChecksumMismatch,
      [SecureStorageErrorType.DecryptedValueLengthMismatch]:
        EciesStringKey.Error_SecureStorageError_DecryptedValueLengthMismatch,
      [SecureStorageErrorType.ValueIsNull]:
        EciesStringKey.Error_SecureStorageError_ValueIsNull,
    };
  }
  constructor(type: SecureStorageErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'SecureStorageError';
  }
}
