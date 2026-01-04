import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export class UserNotFoundError extends HandleableError {
  constructor(statusCode = 404, language?: StringLanguages) {
    super(new Error(translate(StringNames.Error_UserNotFound)), {
      statusCode,
    });
  }
}
