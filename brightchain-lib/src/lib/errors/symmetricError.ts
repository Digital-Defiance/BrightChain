import BrightChainStrings from '../enumerations/brightChainStrings';
import { SymmetricErrorType } from '../enumerations/symmetricErrorType';
import { SymmetricService } from '../services/symmetric.service';
import { TypedError } from './typedError';

export class SymmetricError extends TypedError<SymmetricErrorType> {
  protected get reasonMap(): Record<SymmetricErrorType, BrightChainStrings> {
    return {
      [SymmetricErrorType.DataNullOrUndefined]:
        BrightChainStrings.Error_SymmetricDataNullOrUndefined,
      [SymmetricErrorType.InvalidKeyLength]:
        BrightChainStrings.Error_SymmetricInvalidKeyLengthTemplate,
    };
  }
  constructor(type: SymmetricErrorType, _language?: string) {
    super(type, undefined, {
      KEY_BITS: SymmetricService.symmetricKeyBits,
      KEY_BYTES: SymmetricService.symmetricKeyBytes,
    });
    this.name = 'SymmetricError';
  }
}
