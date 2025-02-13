import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { SymmetricErrorType } from '../enumerations/symmetricErrorType';
import { SymmetricService } from '../services/symmetric.service';
import { TypedError } from './typedError';

export class SymmetricError extends TypedError<SymmetricErrorType> {
  protected get reasonMap(): Record<SymmetricErrorType, StringNames> {
    return {
      [SymmetricErrorType.DataNullOrUndefined]:
        StringNames.Error_SymmetricDataNullOrUndefined,
      [SymmetricErrorType.InvalidKeyLength]:
        StringNames.Error_SymmetricInvalidKeyLengthTemplate,
    };
  }
  constructor(type: SymmetricErrorType, language?: StringLanguages) {
    super(type, language, {
      KEY_BITS: SymmetricService.symmetricKeyBits,
      KEY_BYTES: SymmetricService.symmetricKeyBytes,
    });
    this.name = 'SymmetricError';
  }
}
