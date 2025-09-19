import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class InvalidPasswordError extends HandleableError {
  constructor(language?: StringLanguages, statusCode = 403) {
    super(
      translate(StringNames.Validation_InvalidPassword, undefined, language),
      {
        statusCode,
      },
    );
    this.name = 'InvalidPasswordError';
  }
}
