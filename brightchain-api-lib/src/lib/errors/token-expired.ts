import {
  HandleableError,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class TokenExpiredError extends HandleableError {
  constructor() {
    super(translate(StringName.Validation_TokenExpired), { statusCode: 401 });
  }
}
