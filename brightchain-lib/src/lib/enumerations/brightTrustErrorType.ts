export enum BrightTrustErrorType {
  // Existing error types
  InvalidBrightTrustId = 'InvalidBrightTrustId',
  DocumentNotFound = 'DocumentNotFound',
  UnableToRestoreDocument = 'UnableToRestoreDocument',
  NotImplemented = 'NotImplemented',
  Uninitialized = 'Uninitialized',
  MemberNotFound = 'MemberNotFound',
  NotEnoughMembers = 'NotEnoughMembers',

  // Mode errors
  TransitionInProgress = 'TRANSITION_IN_PROGRESS',
  InvalidModeTransition = 'INVALID_MODE_TRANSITION',
  InsufficientMembersForTransition = 'INSUFFICIENT_MEMBERS_FOR_TRANSITION',

  // Member management errors
  MemberAlreadyExists = 'MEMBER_ALREADY_EXISTS',
  InsufficientRemainingMembers = 'INSUFFICIENT_REMAINING_MEMBERS',
  MemberBanned = 'MEMBER_BANNED',
  MemberSuspended = 'MEMBER_SUSPENDED',

  // Proposal/voting errors
  DuplicateProposal = 'DUPLICATE_PROPOSAL',
  ProposalExpired = 'PROPOSAL_EXPIRED',
  DuplicateVote = 'DUPLICATE_VOTE',
  VoterNotOnProposal = 'VOTER_NOT_ON_PROPOSAL',
  AuthenticationFailed = 'AUTHENTICATION_FAILED',
  VotingLocked = 'VOTING_LOCKED',
  MissingAttachment = 'MISSING_ATTACHMENT',
  AttachmentNotRetrievable = 'ATTACHMENT_NOT_RETRIEVABLE',

  // Ban mechanism errors
  CannotBanSelf = 'CANNOT_BAN_SELF',
  MemberAlreadyBanned = 'MEMBER_ALREADY_BANNED',
  MemberNotBanned = 'MEMBER_NOT_BANNED',
  NewMemberCannotProposeBan = 'NEW_MEMBER_CANNOT_PROPOSE_BAN',
  BanCoolingPeriodNotElapsed = 'BAN_COOLING_PERIOD_NOT_ELAPSED',
  InvalidBanRecordSignatures = 'INVALID_BAN_RECORD_SIGNATURES',

  // Share redistribution errors
  RedistributionFailed = 'REDISTRIBUTION_FAILED',
  InsufficientSharesForReconstruction = 'INSUFFICIENT_SHARES_FOR_RECONSTRUCTION',
  KeyReconstructionValidationFailed = 'KEY_RECONSTRUCTION_VALIDATION_FAILED',

  // Identity errors
  IdentityPermanentlyUnrecoverable = 'IDENTITY_PERMANENTLY_UNRECOVERABLE',
  InvalidMembershipProof = 'INVALID_MEMBERSHIP_PROOF',
  MissingMembershipProof = 'MISSING_MEMBERSHIP_PROOF',
  AliasAlreadyTaken = 'ALIAS_ALREADY_TAKEN',
  AliasNotFound = 'ALIAS_NOT_FOUND',
  AliasInactive = 'ALIAS_INACTIVE',
  IdentitySealingFailed = 'IDENTITY_SEALING_FAILED',
  ShardVerificationFailed = 'SHARD_VERIFICATION_FAILED',

  // Database errors
  BrightTrustDatabaseUnavailable = 'BRIGHT_TRUST_DATABASE_UNAVAILABLE',
  TransactionFailed = 'TRANSACTION_FAILED',

  // Audit errors
  AuditChainCorrupted = 'AUDIT_CHAIN_CORRUPTED',
}
