import { StringLanguage, StringName } from '@brightchain/brightchain-lib';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { SymmetricService } from '../services/symmetric';
import { TypedError } from './typed-error-local';

export class SymmetricError extends TypedError<SymmetricErrorType> {
  protected get reasonMap(): Record<SymmetricErrorType, StringName> {
    return {
      [SymmetricErrorType.DataNullOrUndefined]:
        StringName.Error_SymmetricDataNullOrUndefined,
      [SymmetricErrorType.InvalidKeyLength]:
        StringName.Error_SymmetricInvalidKeyLengthTemplate,
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
