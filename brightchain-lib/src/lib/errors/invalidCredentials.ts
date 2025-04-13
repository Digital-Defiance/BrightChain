import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export class InvalidCredentialsError extends HandleableError {
  constructor(language?: StringLanguages, statusCode = 401) {
    super(new Error(translate(StringNames.Error_InvalidCredentials)), {
      statusCode,
    });
  }
}
