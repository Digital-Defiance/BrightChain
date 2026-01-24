import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class InvalidCredentialsError extends HandleableError {
  constructor(language?: string, statusCode = 401) {
    super(new Error(translate(BrightChainStrings.Error_InvalidCredentials)), {
      statusCode,
    });
  }
}
