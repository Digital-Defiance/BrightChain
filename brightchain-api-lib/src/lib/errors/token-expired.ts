import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

export class TokenExpiredError extends HandleableError {
  constructor() {
    super(
      new Error(
        getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken),
      ),
      { statusCode: 401 },
    );
  }
}
