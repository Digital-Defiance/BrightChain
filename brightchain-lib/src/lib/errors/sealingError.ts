import {
  SealingErrorType,
  SealingErrorTypes,
} from '../enumerations/sealingErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class SealingError extends HandleableError {
  public readonly type: SealingErrorType;
  constructor(
    type: SealingErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(translate(SealingErrorTypes[type], language, params));
    this.name = 'SealingError';
    this.type = type;
  }
}
