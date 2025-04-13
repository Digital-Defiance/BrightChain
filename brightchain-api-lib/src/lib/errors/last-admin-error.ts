import { StringLanguage } from '@brightchain/brightchain-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { LanguageContextSpace } from '@digitaldefiance/i18n-lib';
import { TranslatableError } from './translatable-error-local';

export class LastAdminError extends TranslatableError {
  constructor(language?: StringLanguage, context?: LanguageContextSpace) {
    super(SuiteCoreStringKey.CannotRemoveLastAdmin, undefined, language, context, {
      statusCode: 422,
    });
    this.name = 'LastAdminError';
    Object.setPrototypeOf(this, LastAdminError.prototype);
  }
}
