import { LanguageCode } from '@digitaldefiance/i18n-lib';
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
      [SystemKeyringErrorType.DecryptionFailed]:
        StringNames.Error_SystemKeyringErrorRateLimitExceeded, // Reuse existing error message
    };
  }
  constructor(
    type: SystemKeyringErrorType,
    keyId?: string,
    _language?: LanguageCode,
  ) {
    super(type, undefined, {
      ...(keyId ? { KEY: keyId } : {}),
    });
    this.name = 'SystemKeyringError';
  }
}
