/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguage } from '@brightchain/brightchain-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import {
  EmailTokenType,
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

export class EmailTokenFailedToSendError extends HandleableError {
  constructor(tokenType: EmailTokenType, _language?: StringLanguage) {
    super(
      new Error(
        `${getSuiteCoreTranslation(SuiteCoreStringKey.Email_TokenFailedToSend)}: ${
          tokenType === EmailTokenType.AccountVerification
            ? getSuiteCoreTranslation(
                SuiteCoreStringKey.TokenType_AccountVerification,
              )
            : getSuiteCoreTranslation(
                SuiteCoreStringKey.TokenType_PasswordReset,
              )
        }`,
      ),
    );
  }
}
