import { LanguageCode } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { SystemKeyringErrorType } from '../enumerations/systemKeyringErrorType';
import { TypedError } from './typedError';

export class SystemKeyringError extends TypedError<SystemKeyringErrorType> {
  public get reasonMap(): Record<SystemKeyringErrorType, BrightChainStringKey> {
    return {
      [SystemKeyringErrorType.KeyNotFound]:
        BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate,
      [SystemKeyringErrorType.RateLimitExceeded]:
        BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded,
      [SystemKeyringErrorType.DecryptionFailed]:
        BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded, // Reuse existing error message
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
