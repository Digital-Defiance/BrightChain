import {
  LanguageContext,
  StringLanguage,
  StringName,
} from '@brightchain/brightchain-lib';
import { TranslatableError } from './translatable-error-local';

export class LastAdminError extends TranslatableError {
  constructor(language?: StringLanguage, context?: LanguageContext) {
    super(StringName.CannotRemoveLastAdmin, undefined, language, context, {
      statusCode: 422,
    });
    this.name = 'LastAdminError';
    Object.setPrototypeOf(this, LastAdminError.prototype);
  }
}
