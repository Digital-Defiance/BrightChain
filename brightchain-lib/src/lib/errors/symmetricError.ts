import { StringLanguages } from '../enumerations/stringLanguages';
import {
  SymmetricErrorType,
  SymmetricErrorTypes,
} from '../enumerations/symmetricErrorType';
import { translate } from '../i18n';
import { SymmetricService } from '../services/symmetric.service';
import { HandleableError } from './handleable';

export class SymmetricError extends HandleableError {
  public readonly reason: SymmetricErrorType;
  constructor(reason: SymmetricErrorType, language?: StringLanguages) {
    super(
      translate(SymmetricErrorTypes[reason], language, {
        KEY_BITS: SymmetricService.symmetricKeyBits,
        KEY_BYTES: SymmetricService.symmetricKeyBytes,
      }),
    );
    this.name = 'SymmetricError';
    this.reason = reason;
  }
}
