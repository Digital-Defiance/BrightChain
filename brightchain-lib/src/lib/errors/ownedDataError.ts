import { OwnedDataErrorType } from '../enumerations/ownedDataErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class OwnedDataError extends TypedError<OwnedDataErrorType> {
  public get reasonMap(): Record<OwnedDataErrorType, StringNames> {
    return {
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
  }
  constructor(type: OwnedDataErrorType, language?: StringLanguages) {
    super(type, language);
    this.name = 'OwnedDataError';
  }
}
