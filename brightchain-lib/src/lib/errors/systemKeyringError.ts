import { LanguageCode } from '@digitaldefiance/i18n-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { SystemKeyringErrorType } from '../enumerations/systemKeyringErrorType';
import { TypedError } from './typedError';

export class SystemKeyringError extends TypedError<SystemKeyringErrorType> {
  public get reasonMap(): Record<SystemKeyringErrorType, BrightChainStrings> {
    return {
      [SystemKeyringErrorType.KeyNotFound]:
        BrightChainStrings.Error_SystemKeyringErrorKeyNotFoundTemplate,
      [SystemKeyringErrorType.RateLimitExceeded]:
        BrightChainStrings.Error_SystemKeyringErrorRateLimitExceeded,
      [SystemKeyringErrorType.DecryptionFailed]:
        BrightChainStrings.Error_SystemKeyringErrorRateLimitExceeded, // Reuse existing error message
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
