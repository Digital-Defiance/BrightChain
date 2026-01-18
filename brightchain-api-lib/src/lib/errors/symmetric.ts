import { SymmetricService } from '@brightchain/brightchain-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { StringLanguage } from '../interfaces/request-user';
import { TypedError } from './typed-error-local';

export class SymmetricError extends TypedError<
  SymmetricErrorType,
  SuiteCoreStringKey
> {
  protected get reasonMap(): Record<SymmetricErrorType, SuiteCoreStringKey> {
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
