import { StringLanguage, StringName } from '@brightchain/brightchain-lib';
import { TranslatableError } from './translatable-error-local';

export class AdminRoleNotFoundError extends TranslatableError {
  constructor(language?: StringLanguage) {
    super(StringName.AdminRoleNotFound, undefined, language);
    this.name = 'AdminRoleNotFoundError';
    Object.setPrototypeOf(this, AdminRoleNotFoundError.prototype);
  }
}
