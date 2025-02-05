import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class TokenExpiredError extends HandleableError {
  constructor() {
    super(translate(StringNames.Error_TokenExpired), {
      statusCode: 401,
    });
    this.name = 'TokenExpiredError';
  }
}
