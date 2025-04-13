import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

export class InvalidChallengeResponseError extends HandleableError {
  constructor() {
    super(
      new Error(
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Error_InvalidChallengeResponse,
        ),
      ),
      {
        statusCode: 401,
      },
    );
  }
}
