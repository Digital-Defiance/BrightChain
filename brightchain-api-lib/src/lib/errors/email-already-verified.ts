import { HandleableError } from '@digitaldefiance/i18n-lib';

export class EmailAlreadyVerifiedError extends HandleableError {
  constructor(userId: string) {
    super(new Error(`Email already verified for userId: ${userId}`));
  }
}
