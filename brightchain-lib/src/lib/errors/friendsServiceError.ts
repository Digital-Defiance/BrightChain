import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { BrightChainStringKey, BrightChainStrings } from '../enumerations';
import { FriendsErrorCode } from '../enumerations/friendsErrorCode';
import { TranslatableBrightChainError } from './translatableBrightChainError';

/**
 * Maps each FriendsErrorCode to its corresponding i18n BrightChainStrings key.
 */
const errorCodeToStringKey: Record<FriendsErrorCode, BrightChainStringKey> = {
  [FriendsErrorCode.SelfRequestNotAllowed]:
    BrightChainStrings.Error_Friends_SelfRequestNotAllowed,
  [FriendsErrorCode.AlreadyFriends]:
    BrightChainStrings.Error_Friends_AlreadyFriends,
  [FriendsErrorCode.RequestAlreadyExists]:
    BrightChainStrings.Error_Friends_RequestAlreadyExists,
  [FriendsErrorCode.RequestNotFound]:
    BrightChainStrings.Error_Friends_RequestNotFound,
  [FriendsErrorCode.NotFriends]:
    BrightChainStrings.Error_Friends_NotFriends,
  [FriendsErrorCode.UserBlocked]:
    BrightChainStrings.Error_Friends_UserBlocked,
  [FriendsErrorCode.Unauthorized]:
    BrightChainStrings.Error_Friends_Unauthorized,
};

/**
 * Error class for Friends system operations.
 * Extends {@link TranslatableBrightChainError} so the error message is
 * resolved via i18n. Carries a typed {@link FriendsErrorCode} so callers
 * (and the API layer) can map to the appropriate HTTP status without
 * string matching.
 */
export class FriendsServiceError extends TranslatableBrightChainError {
  constructor(
    public readonly code: FriendsErrorCode,
    messageOrLanguage?: string | CoreLanguageCode,
    language?: CoreLanguageCode,
  ) {
    const stringKey = errorCodeToStringKey[code];
    const lang =
      language ??
      (typeof messageOrLanguage === 'string' &&
      ['en-US', 'en-GB', 'fr', 'de', 'es', 'ja', 'zh-CN', 'uk'].includes(
        messageOrLanguage,
      )
        ? (messageOrLanguage as CoreLanguageCode)
        : undefined);

    super(stringKey, undefined, lang);
    this.name = 'FriendsServiceError';
    Object.setPrototypeOf(this, FriendsServiceError.prototype);
  }

  /**
   * Get the i18n string key for a given FriendsErrorCode.
   */
  static getStringKeyForCode(code: FriendsErrorCode): BrightChainStringKey {
    return errorCodeToStringKey[code];
  }
}
