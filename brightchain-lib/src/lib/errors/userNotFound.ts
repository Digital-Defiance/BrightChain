import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class UserNotFoundError extends HandleableError {
  constructor(statusCode = 404, _language?: string) {
    super(new Error(translate(BrightChainStrings.Error_UserNotFound)), {
      statusCode,
    });
  }
}
