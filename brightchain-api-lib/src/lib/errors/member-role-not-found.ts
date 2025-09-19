import {
  LanguageContext,
  StringLanguage,
  StringName,
} from '@brightchain/brightchain-lib';
import { TranslatableError } from './translatable-error-local';

export class MemberRoleNotFoundError extends TranslatableError {
  constructor(language?: StringLanguage, context?: LanguageContext) {
    super(StringName.MemberRoleNotFound, undefined, language, context);
    this.name = 'MemberRoleNotFoundError';
    Object.setPrototypeOf(this, MemberRoleNotFoundError.prototype);
  }
}
