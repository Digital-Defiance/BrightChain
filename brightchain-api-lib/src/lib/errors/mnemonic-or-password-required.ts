import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export class MnemonicOrPasswordRequiredError extends HandleableError {
  constructor() {
    super(new Error(getSuiteCoreTranslation(SuiteCoreStringKey.Validation_MnemonicOrPasswordRequired)), {
      statusCode: 422,
    });
  }
}
