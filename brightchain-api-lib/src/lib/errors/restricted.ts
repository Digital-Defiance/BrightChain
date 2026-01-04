import { HandleableError } from '@digitaldefiance/i18n-lib';

export class RestrictedError extends HandleableError {
  constructor() {
    super(new Error('Access denied for child users'), {
      statusCode: 403,
    });
    this.name = 'RestrictedError';
    Object.setPrototypeOf(this, RestrictedError.prototype);
  }
}
