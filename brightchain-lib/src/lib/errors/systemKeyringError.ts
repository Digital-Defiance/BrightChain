import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { SystemKeyringErrorType } from '../enumerations/systemKeyringErrorType';
import { TypedError } from './typedError';

export class SystemKeyringError extends TypedError<SystemKeyringErrorType> {
  public get reasonMap(): Record<SystemKeyringErrorType, StringNames> {
    return {
      [SystemKeyringErrorType.KeyNotFound]:
        StringNames.Error_SystemKeyringErrorKeyNotFoundTemplate,
      [SystemKeyringErrorType.RateLimitExceeded]:
        StringNames.Error_SystemKeyringErrorRateLimitExceeded,
    };
  }
  constructor(
    type: SystemKeyringErrorType,
    keyId?: string,
    language?: StringLanguages,
  ) {
    super(type, undefined, {
      ...(keyId ? { KEY: keyId } : {}),
    });
    this.name = 'SystemKeyringError';
  }
}
