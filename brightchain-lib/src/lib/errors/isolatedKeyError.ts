import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { IsolatedKeyErrorType } from '../enumerations/isolatedKeyErrorType';
import { TypedError } from './typedError';

export class IsolatedKeyError extends TypedError<IsolatedKeyErrorType> {
  public get reasonMap(): Record<IsolatedKeyErrorType, BrightChainStringKey> {
    return {
      [IsolatedKeyErrorType.InvalidPublicKey]:
        BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey,
      [IsolatedKeyErrorType.InvalidKeyId]:
        BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId,
      [IsolatedKeyErrorType.InvalidKeyFormat]:
        BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat,
      [IsolatedKeyErrorType.InvalidKeyLength]:
        BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength,
      [IsolatedKeyErrorType.InvalidKeyType]:
        BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType,
      [IsolatedKeyErrorType.KeyIsolationViolation]:
        BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation,
    };
  }
  constructor(type: IsolatedKeyErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'IsolatedKeyError';
  }
}
