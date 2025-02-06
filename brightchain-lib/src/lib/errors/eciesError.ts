import {
  EciesErrorType,
  EciesErrorTypes,
} from '../enumerations/eciesErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class EciesError extends HandleableError {
  public readonly reason: EciesErrorType;

  constructor(
    reason: EciesErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(translate(EciesErrorTypes[reason], language, templateParams));
    this.name = 'EciesError';
    this.reason = reason;
  }
}
