import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { SymmetricErrorType } from '../enumerations/symmetricErrorType';
import { SymmetricService } from '../services/symmetric.service';
import { TypedError } from './typedError';

export class SymmetricError extends TypedError<
  SymmetricErrorType,
  BrightChainStrings | SuiteCoreStringKey
> {
  protected get reasonMap(): Record<
    SymmetricErrorType,
    BrightChainStrings | SuiteCoreStringKey
  > {
    return {
      [SymmetricErrorType.DataNullOrUndefined]:
        SuiteCoreStringKey.Error_SymmetricDataNullOrUndefined,
      [SymmetricErrorType.InvalidKeyLength]:
        SuiteCoreStringKey.Error_SymmetricInvalidKeyLengthTemplate,
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
