import { CblErrorType, CblErrorTypes } from '../enumerations/cblErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class CblError extends HandleableError {
  public readonly reason: CblErrorType;

  constructor(
    reason: CblErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(translate(CblErrorTypes[reason], language, templateParams));
    this.name = 'CblError';
    this.reason = reason;
  }
}
