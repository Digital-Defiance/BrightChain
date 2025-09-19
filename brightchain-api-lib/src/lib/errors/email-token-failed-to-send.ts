import {
  EmailTokenType,
  HandleableError,
  StringLanguage,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class EmailTokenFailedToSendError extends HandleableError {
  constructor(tokenType: EmailTokenType, language?: StringLanguage) {
    super(
      `${translate(StringName.Email_TokenFailedToSend, undefined, language)}: ${
        tokenType === EmailTokenType.AccountVerification
          ? translate(
              StringName.TokenType_AccountVerification,
              undefined,
              language,
            )
          : translate(StringName.TokenType_PasswordReset, undefined, language)
      }`,
    );
  }
}
