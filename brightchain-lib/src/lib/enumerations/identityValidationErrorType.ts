export enum IdentityValidationErrorType {
  InvalidSignature = 'INVALID_SIGNATURE',
  UnregisteredAlias = 'UNREGISTERED_ALIAS',
  InactiveAlias = 'INACTIVE_ALIAS',
  InvalidMembershipProof = 'INVALID_MEMBERSHIP_PROOF',
  MissingMembershipProof = 'MISSING_MEMBERSHIP_PROOF',
  BannedUser = 'BANNED_USER',
  SuspendedUser = 'SUSPENDED_USER',
  ShardVerificationFailed = 'SHARD_VERIFICATION_FAILED',
}
