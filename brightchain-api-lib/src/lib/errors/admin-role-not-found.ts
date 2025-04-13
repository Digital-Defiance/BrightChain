import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { StringLanguage } from '../interfaces/request-user';
import { TranslatableError } from './translatable-error-local';

export class AdminRoleNotFoundError extends TranslatableError {
  constructor(language?: StringLanguage) {
    super(SuiteCoreStringKey.AdminRoleNotFound, undefined, language);
    this.name = 'AdminRoleNotFoundError';
    Object.setPrototypeOf(this, AdminRoleNotFoundError.prototype);
  }
}
