// Local TranslatableError to avoid circular dependencies with main lib

import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { LanguageContext } from '../sharedTypes';
import { HandleableError } from './handleable';

export class TranslatableError extends HandleableError {
  constructor(
    string: StringNames,
    otherVars?: Record<string, string | number>,
    language?: StringLanguages,
    context?: LanguageContext,
    options?: { statusCode?: number },
  ) {
    super(translate(string, otherVars, language, context), {
      statusCode: options?.statusCode ?? 500,
    });
    this.name = 'TranslatedError';
  }
}
