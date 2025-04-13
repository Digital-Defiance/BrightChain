/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguage } from '@brightchain/brightchain-lib';
import { LanguageContextSpace } from '@digitaldefiance/i18n-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { TranslatableError } from './translatable-error-local';

export class MemberRoleNotFoundError extends TranslatableError {
  constructor(language?: StringLanguage, context?: LanguageContextSpace) {
    super(SuiteCoreStringKey.MemberRoleNotFound, undefined, language, context);
    this.name = 'MemberRoleNotFoundError';
    Object.setPrototypeOf(this, MemberRoleNotFoundError.prototype);
  }
}
