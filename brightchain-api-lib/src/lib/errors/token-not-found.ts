import {
  LanguageContext,
  StringLanguage,
  StringName,
} from '@brightchain/brightchain-lib';
import { TranslatableError } from './translatable-error-local';

export class TokenNotFoundError extends TranslatableError {
  public readonly token: string;
  constructor(
    token: string,
    language?: StringLanguage,
    context?: LanguageContext,
    statusCode = 404,
  ) {
    super(
      StringName.TokenNotFoundTemplate,
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
