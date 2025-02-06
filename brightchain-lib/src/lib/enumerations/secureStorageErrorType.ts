import { StringNames } from './stringNames';

export enum SecureStorageErrorType {
  DecryptedValueLengthMismatch,
  DecryptedValueChecksumMismatch,
}

export const SecureStorageErrorTypes: {
  [key in SecureStorageErrorType]: StringNames;
} = {
  [SecureStorageErrorType.DecryptedValueChecksumMismatch]:
    StringNames.Error_SecureStorageDecryptedValueChecksumMismatch,
  [SecureStorageErrorType.DecryptedValueLengthMismatch]:
    StringNames.Error_SecureStorageDecryptedValueLengthMismatch,
};
