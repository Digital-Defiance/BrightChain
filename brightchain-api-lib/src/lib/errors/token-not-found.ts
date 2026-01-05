import { LanguageContextSpace } from '@digitaldefiance/i18n-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { StringLanguage } from '../interfaces/request-user';
import { TranslatableError } from './translatable-error-local';

export class TokenNotFoundError extends TranslatableError {
  public readonly token: string;
  constructor(
    token: string,
    language?: StringLanguage,
    context?: LanguageContextSpace,
    statusCode = 404,
  ) {
    super(
      SuiteCoreStringKey.TokenNotFoundTemplate,
      {
        TOKEN: token,
      },
      language,
      context,
      {
        statusCode,
      },
    );
    this.token = token;
    this.name = 'TokenNotFoundError';
    Object.setPrototypeOf(this, TokenNotFoundError.prototype);
  }
}
