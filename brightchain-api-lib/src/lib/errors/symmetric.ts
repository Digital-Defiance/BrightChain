import { SymmetricService } from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreStringKey,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { TypedError } from './typed-error-local';

export class SymmetricError extends TypedError<
  SymmetricErrorType,
  SuiteCoreStringKeyValue
> {
  protected get reasonMap(): Record<
    SymmetricErrorType,
    SuiteCoreStringKeyValue
  > {
    return {
      [SymmetricErrorType.DataNullOrUndefined]:
        SuiteCoreStringKey.Error_SymmetricDataNullOrUndefined,
      [SymmetricErrorType.InvalidKeyLength]:
        SuiteCoreStringKey.Error_SymmetricInvalidKeyLengthTemplate,
    };
  }
  constructor(type: SymmetricErrorType, language?: CoreLanguageCode) {
    super(type, language, {
      KEY_BITS: SymmetricService.symmetricKeyBits,
      KEY_BYTES: SymmetricService.symmetricKeyBytes,
    });
    this.name = 'SymmetricError';
  }
}
