import {
  EciesStringKey,
  EciesStringKeyValue,
} from '@digitaldefiance/ecies-lib';
import { BrightChainStringKey } from '../enumerations/brightChainStrings';
import { SecureStorageErrorType } from '../enumerations/secureStorageErrorType';
import { TypedError } from './typedError';

export class SecureStorageError extends TypedError<
  SecureStorageErrorType,
  BrightChainStringKey | EciesStringKeyValue
> {
  public get reasonMap(): Record<
    SecureStorageErrorType,
    BrightChainStringKey | EciesStringKeyValue
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
