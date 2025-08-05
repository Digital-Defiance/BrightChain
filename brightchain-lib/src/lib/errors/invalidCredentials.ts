import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class InvalidCredentialsError extends HandleableError {
  constructor(language?: StringLanguages, statusCode = 401) {
    super(translate(StringNames.Error_InvalidCredentials), {
      statusCode,
    });
    this.name = 'InvalidCredentialsError';
  }
}
