import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class TokenInvalidError extends HandleableError {
  constructor() {
    super(translate(StringNames.Error_TokenInvalid), {
      statusCode: 401,
    });
  }
}
