import { HandleableError } from '@digitaldefiance/i18n-lib';

export class InvalidExpiredTokenError extends HandleableError {
  constructor() {
    super(new Error('Invalid or expired password reset token'));
    this.name = 'InvalidExpiredTokenError';
    Object.setPrototypeOf(this, InvalidExpiredTokenError.prototype);
  }
}
