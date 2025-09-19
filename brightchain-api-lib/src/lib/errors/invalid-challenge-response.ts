import {
  HandleableError,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class InvalidChallengeResponseError extends HandleableError {
  constructor() {
    super(translate(StringName.Error_InvalidChallengeResponse), {
      statusCode: 401,
    });
  }
}
