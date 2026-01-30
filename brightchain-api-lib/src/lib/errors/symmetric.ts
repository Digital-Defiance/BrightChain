import { SymmetricService } from '@brightchain/brightchain-lib';
import {
  SuiteCoreStringKey,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { StringLanguage } from '../interfaces/request-user';
import { TypedError } from './typed-error-local';

export class SymmetricError extends TypedError<
  SymmetricErrorType,
  SuiteCoreStringKeyValue
> {
  protected get reasonMap(): Record<SymmetricErrorType, SuiteCoreStringKeyValue> {
    return {
      [SymmetricErrorType.DataNullOrUndefined]:
        SuiteCoreStringKey.Error_SymmetricDataNullOrUndefined,
      [SymmetricErrorType.InvalidKeyLength]:
        SuiteCoreStringKey.Error_SymmetricInvalidKeyLengthTemplate,
    };
  }
  constructor(type: SymmetricErrorType, language?: StringLanguage) {
    super(type, language, {
      KEY_BITS: SymmetricService.symmetricKeyBits,
      KEY_BYTES: SymmetricService.symmetricKeyBytes,
    });
    this.name = 'SymmetricError';
  }
}
