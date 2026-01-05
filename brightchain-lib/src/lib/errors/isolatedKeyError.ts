import { IsolatedKeyErrorType } from '../enumerations/isolatedKeyErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class IsolatedKeyError extends TypedError<IsolatedKeyErrorType> {
  public get reasonMap(): Record<IsolatedKeyErrorType, StringNames> {
    return {
      [IsolatedKeyErrorType.InvalidPublicKey]:
        StringNames.Error_IsolatedKeyErrorInvalidPublicKey,
      [IsolatedKeyErrorType.InvalidKeyId]:
        StringNames.Error_IsolatedKeyErrorInvalidKeyId,
      [IsolatedKeyErrorType.InvalidKeyFormat]:
        StringNames.Error_IsolatedKeyErrorInvalidKeyFormat,
      [IsolatedKeyErrorType.InvalidKeyLength]:
        StringNames.Error_IsolatedKeyErrorInvalidKeyLength,
      [IsolatedKeyErrorType.InvalidKeyType]:
        StringNames.Error_IsolatedKeyErrorInvalidKeyType,
      [IsolatedKeyErrorType.KeyIsolationViolation]:
        StringNames.Error_IsolatedKeyErrorKeyIsolationViolation,
    };
  }
  constructor(type: IsolatedKeyErrorType, _language?: StringLanguages) {
    super(type, undefined);
    this.name = 'IsolatedKeyError';
  }
}
