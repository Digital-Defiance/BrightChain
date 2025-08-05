import { SealingErrorType } from '../enumerations/sealingErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class SealingError extends TypedError<SealingErrorType> {
  public get reasonMap(): Record<SealingErrorType, StringNames> {
    return {
      [SealingErrorType.InvalidBitRange]:
        StringNames.Error_SealingErrorInvalidBitRange,
      [SealingErrorType.InvalidMemberArray]:
        StringNames.Error_SealingErrorInvalidMemberArray,
      [SealingErrorType.NotEnoughMembersToUnlock]:
        StringNames.Error_SealingErrorNotEnoughMembersToUnlock,
      [SealingErrorType.TooManyMembersToUnlock]:
        StringNames.Error_SealingErrorTooManyMembersToUnlock,
      [SealingErrorType.MissingPrivateKeys]:
        StringNames.Error_SealingErrorMissingPrivateKeys,
      [SealingErrorType.EncryptedShareNotFound]:
        StringNames.Error_SealingErrorEncryptedShareNotFound,
      [SealingErrorType.MemberNotFound]:
        StringNames.Error_SealingErrorMemberNotFound,
      [SealingErrorType.FailedToSeal]:
        StringNames.Error_SealingErrorFailedToSealTemplate,
    };
  }
  constructor(
    type: SealingErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(type, undefined, params);
    this.name = 'SealingError';
  }
}
