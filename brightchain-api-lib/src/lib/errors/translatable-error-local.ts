// Local TranslatableError to avoid circular dependencies with main lib
import {
  SuiteCoreStringKey,
  getSuiteCoreTranslation as translate,
} from '@digitaldefiance/suite-core-lib';
import { HandleableError, LanguageContextSpace, HandleableErrorOptions } from '@digitaldefiance/i18n-lib';
import { StringLanguage } from '../interfaces/request-user';

export class TranslatableError extends HandleableError {
  constructor(
    string: SuiteCoreStringKey,
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
