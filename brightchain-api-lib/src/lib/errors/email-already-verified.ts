import { HandleableError } from '@brightchain/brightchain-lib';

export class EmailAlreadyVerifiedError extends HandleableError {
  constructor(userId: string) {
    super(`Email already verified for userId: ${userId}`);
  }
}
