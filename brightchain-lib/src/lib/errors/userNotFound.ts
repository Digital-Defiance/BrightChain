import { HandleableError } from '@digitaldefiance/i18n-lib';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class UserNotFoundError extends HandleableError {
  constructor(statusCode = 404, _language?: string) {
    super(new Error(translate(StringNames.Error_UserNotFound)), {
      statusCode,
    });
  }
}
