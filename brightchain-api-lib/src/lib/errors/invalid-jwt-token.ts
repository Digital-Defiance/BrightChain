import {
  HandleableError,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class InvalidJwtTokenError extends HandleableError {
  constructor() {
    super(translate(StringName.Validation_InvalidToken), { statusCode: 401 });
  }
}
