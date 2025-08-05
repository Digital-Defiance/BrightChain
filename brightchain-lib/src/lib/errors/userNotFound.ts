import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class UserNotFoundError extends HandleableError {
  constructor(statusCode = 404, language?: StringLanguages) {
    super(translate(StringNames.Error_UserNotFound), {
      statusCode,
    });
    this.name = 'UserNotFoundError';
  }
}
