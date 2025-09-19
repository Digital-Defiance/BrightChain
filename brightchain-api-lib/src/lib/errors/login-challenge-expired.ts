import {
  HandleableError,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class LoginChallengeExpiredError extends HandleableError {
  constructor() {
    super(translate(StringName.Error_Login_ChallengeExpiredTemplate), {
      statusCode: 401,
    });
  }
}
