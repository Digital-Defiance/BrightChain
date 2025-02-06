import { StringNames } from './stringNames';

export enum MultiEncryptedErrorType {
  DataTooShort = 'DataTooShort',
  DataLengthExceedsCapacity = 'DataLengthExceedsCapacity',
  CreatorMustBeMember = 'CreatorMustBeMember',
  BlockNotReadable = 'BlockNotReadable',
  InvalidEphemeralPublicKeyLength = 'InvalidEphemeralPublicKeyLength',
  InvalidIVLength = 'InvalidIVLength',
  InvalidAuthTagLength = 'InvalidAuthTagLength',
  ChecksumMismatch = 'ChecksumMismatch',
}

export const MultiEncryptedErrorTypes: {
  [key in MultiEncryptedErrorType]: StringNames;
} = {
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
};
