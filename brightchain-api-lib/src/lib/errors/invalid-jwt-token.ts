import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export class InvalidJwtTokenError extends HandleableError {
  constructor() {
    super(new Error(getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken)), { statusCode: 401 });
  }
}
