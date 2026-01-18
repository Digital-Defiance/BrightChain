import { HandleableError } from '@digitaldefiance/i18n-lib';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class InvalidCredentialsError extends HandleableError {
  constructor(language?: string, statusCode = 401) {
    super(new Error(translate(StringNames.Error_InvalidCredentials)), {
      statusCode,
    });
  }
}
