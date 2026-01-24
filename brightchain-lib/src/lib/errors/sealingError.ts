import BrightChainStrings from '../enumerations/brightChainStrings';
import { SealingErrorType } from '../enumerations/sealingErrorType';
import { TypedError } from './typedError';

export class SealingError extends TypedError<SealingErrorType> {
  public get reasonMap(): Record<SealingErrorType, BrightChainStrings> {
    return {
      [SealingErrorType.InvalidBitRange]:
        BrightChainStrings.Error_SealingErrorInvalidBitRange,
      [SealingErrorType.InvalidMemberArray]:
        BrightChainStrings.Error_SealingErrorInvalidMemberArray,
      [SealingErrorType.NotEnoughMembersToUnlock]:
        BrightChainStrings.Error_SealingErrorNotEnoughMembersToUnlock,
      [SealingErrorType.TooManyMembersToUnlock]:
        BrightChainStrings.Error_SealingErrorTooManyMembersToUnlock,
      [SealingErrorType.MissingPrivateKeys]:
        BrightChainStrings.Error_SealingErrorMissingPrivateKeys,
      [SealingErrorType.EncryptedShareNotFound]:
        BrightChainStrings.Error_SealingErrorEncryptedShareNotFound,
      [SealingErrorType.MemberNotFound]:
        BrightChainStrings.Error_SealingErrorMemberNotFound,
      [SealingErrorType.FailedToSeal]:
        BrightChainStrings.Error_SealingErrorFailedToSealTemplate,
    };
  }
  constructor(
    type: SealingErrorType,
    language?: string,
    params?: { [key: string]: string | number },
  ) {
    super(type, undefined, params);
    this.name = 'SealingError';
  }
}
