import { StringLanguages } from '../enumerations/stringLanguages';
import {
  SymmetricErrorType,
  SymmetricErrorTypes,
} from '../enumerations/symmetricErrorType';
import { translate } from '../i18n';
import { StaticHelpersSymmetric } from '../staticHelpers.symmetric';
import { HandleableError } from './handleable';

export class SymmetricError extends HandleableError {
  public readonly reason: SymmetricErrorType;
  constructor(reason: SymmetricErrorType, language?: StringLanguages) {
    super(
      translate(SymmetricErrorTypes[reason], language, {
        KEY_BITS: StaticHelpersSymmetric.SymmetricKeyBits,
        KEY_BYTES: StaticHelpersSymmetric.SymmetricKeyBytes,
      }),
    );
    this.name = 'SymmetricError';
    this.reason = reason;
  }
}
