import { HandleableError } from '@brightchain/brightchain-lib';

export class RestrictedError extends HandleableError {
  constructor() {
    super('Access denied for child users', {
      statusCode: 403,
    });
    this.name = 'RestrictedError';
    Object.setPrototypeOf(this, RestrictedError.prototype);
  }
}
