import BrightChainStrings from '../enumerations/brightChainStrings';
import { SealingErrorType } from '../enumerations/sealingErrorType';
import { TypedError } from './typedError';

export class SealingError extends TypedError<SealingErrorType> {
  public get reasonMap(): Record<SealingErrorType, BrightChainStrings> {
    return {
      [SealingErrorType.InvalidBitRange]:
        BrightChainStrings.Error_SealingError_InvalidBitRange,
      [SealingErrorType.InvalidMemberArray]:
        BrightChainStrings.Error_SealingError_InvalidMemberArray,
      [SealingErrorType.NotEnoughMembersToUnlock]:
        BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock,
      [SealingErrorType.TooManyMembersToUnlock]:
        BrightChainStrings.Error_SealingError_TooManyMembersToUnlock,
      [SealingErrorType.MissingPrivateKeys]:
        BrightChainStrings.Error_SealingError_MissingPrivateKeys,
      [SealingErrorType.EncryptedShareNotFound]:
        BrightChainStrings.Error_SealingError_EncryptedShareNotFound,
      [SealingErrorType.MemberNotFound]:
        BrightChainStrings.Error_SealingError_MemberNotFound,
      [SealingErrorType.FailedToSeal]:
        BrightChainStrings.Error_SealingError_FailedToSealTemplate,
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
