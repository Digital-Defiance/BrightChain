import { FecErrorType, FecErrorTypes } from '../enumerations/fecErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class FecError extends HandleableError {
  public readonly reason: FecErrorType;

  constructor(
    reason: FecErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(translate(FecErrorTypes[reason], language, templateParams));
    this.name = 'FecError';
    this.reason = reason;
  }
}
