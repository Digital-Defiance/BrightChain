// Local TranslatableError to avoid circular dependencies with main lib
import {
  HandleableError,
  LanguageContext,
  StringLanguage,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class TranslatableError extends HandleableError {
  constructor(
    string: StringName,
    otherVars?: Record<string, string | number>,
    language?: StringLanguage,
    context?: LanguageContext,
    options?: { statusCode?: number },
  ) {
    super(translate(string, otherVars, language, context), {
      statusCode: options?.statusCode ?? 500,
    });
    this.name = 'TranslatedError';
  }
}
