// Local TranslatableError to avoid circular dependencies with main lib
import {
  HandleableError,
  HandleableErrorOptions,
  LanguageContextSpace,
} from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreStringKeyValue,
  getSuiteCoreTranslation as translate,
} from '@digitaldefiance/suite-core-lib';
import { StringLanguage } from '../interfaces/request-user';

export class TranslatableError extends HandleableError {
  constructor(
    string: SuiteCoreStringKeyValue,
    otherVars?: Record<string, string | number>,
    language?: StringLanguage,
    context?: LanguageContextSpace,
    options?: HandleableErrorOptions,
  ) {
    super(new Error(translate(string, otherVars, language)), {
      statusCode: 500,
      ...options,
    });
    this.name = 'TranslatedError';
  }
}
