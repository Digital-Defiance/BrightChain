import { StringNames } from './stringNames';

export enum OwnedDataErrorType {
  CreatorRequired = 'CreatorRequired',
  DataRequired = 'DataRequired',
  DataLengthExceedsCapacity = 'DataLengthExceedsCapacity',
  ActualDataLengthNegative = 'ActualDataLengthNegative',
  ActualDataLengthExceedsDataLength = 'ActualDataLengthExceedsDataLength',
  CreatorRequiredForEncryption = 'CreatorRequiredForEncryption',
  UnexpectedEncryptedBlockType = 'UnexpectedEncryptedBlockType',
}

export const OwnedDataErrorTypes: {
  [key in OwnedDataErrorType]: StringNames;
} = {
  [OwnedDataErrorType.CreatorRequired]:
    StringNames.Error_OwnedDataErrorCreatorRequired,
  [OwnedDataErrorType.DataRequired]:
    StringNames.Error_OwnedDataErrorDataRequired,
  [OwnedDataErrorType.DataLengthExceedsCapacity]:
    StringNames.Error_OwnedDataErrorDataLengthExceedsCapacity,
  [OwnedDataErrorType.ActualDataLengthNegative]:
    StringNames.Error_OwnedDataErrorActualDataLengthNegative,
  [OwnedDataErrorType.ActualDataLengthExceedsDataLength]:
    StringNames.Error_OwnedDataErrorActualDataLengthExceedsDataLength,
  [OwnedDataErrorType.CreatorRequiredForEncryption]:
    StringNames.Error_OwnedDataErrorCreatorRequiredForEncryption,
  [OwnedDataErrorType.UnexpectedEncryptedBlockType]:
    StringNames.Error_OwnedDataErrorUnexpectedEncryptedBlockType,
};
