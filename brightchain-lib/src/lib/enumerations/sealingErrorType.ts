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
