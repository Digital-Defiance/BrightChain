// Local TranslatableError to avoid circular dependencies with main lib

import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { LanguageContext } from '../sharedTypes';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export class TranslatableError extends HandleableError {
  public readonly StringName: StringNames;
  constructor(
    string: StringNames,
    otherVars?: Record<string, string | number>,
    language?: StringLanguages,
    context?: LanguageContext,
    options?: { statusCode?: number },
  ) {
    super(new Error(translate(string, otherVars, language)), {
      statusCode: options?.statusCode ?? 500,
    });
    this.name = 'TranslatedError';
    this.StringName = string;
  }
}
