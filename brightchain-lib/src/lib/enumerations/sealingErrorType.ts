import { StringNames } from './stringNames';

export enum SealingErrorType {
  InvalidBitRange = 'InvalidBitRange',
  InvalidMemberArray = 'InvalidMemberArray',
  NotEnoughMembersToUnlock = 'NotEnoughMembersToUnlock',
  TooManyMembersToUnlock = 'TooManyMembersToUnlock',
  MissingPrivateKeys = 'MissingPrivateKeys',
  EncryptedShareNotFound = 'EncryptedShareNotFound',
  MemberNotFound = 'MemberNotFound',
  FailedToSeal = 'FailedToSeal',
}

export const SealingErrorTypes: {
  [key in SealingErrorType]: StringNames;
} = {
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
