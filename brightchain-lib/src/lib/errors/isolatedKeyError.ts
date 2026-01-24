import { IsolatedKeyErrorType } from '../enumerations/isolatedKeyErrorType';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class IsolatedKeyError extends TypedError<IsolatedKeyErrorType> {
  public get reasonMap(): Record<IsolatedKeyErrorType, BrightChainStrings> {
    return {
      [IsolatedKeyErrorType.InvalidPublicKey]:
        BrightChainStrings.Error_IsolatedKeyErrorInvalidPublicKey,
      [IsolatedKeyErrorType.InvalidKeyId]:
        BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyId,
      [IsolatedKeyErrorType.InvalidKeyFormat]:
        BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyFormat,
      [IsolatedKeyErrorType.InvalidKeyLength]:
        BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyLength,
      [IsolatedKeyErrorType.InvalidKeyType]:
        BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyType,
      [IsolatedKeyErrorType.KeyIsolationViolation]:
        BrightChainStrings.Error_IsolatedKeyErrorKeyIsolationViolation,
    };
  }
  constructor(type: IsolatedKeyErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'IsolatedKeyError';
  }
}
