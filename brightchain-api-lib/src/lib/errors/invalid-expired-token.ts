import { HandleableError } from '@brightchain/brightchain-lib';

export class InvalidExpiredTokenError extends HandleableError {
  constructor() {
    super('Invalid or expired password reset token');
    this.name = 'InvalidExpiredTokenError';
    Object.setPrototypeOf(this, InvalidExpiredTokenError.prototype);
  }
}
