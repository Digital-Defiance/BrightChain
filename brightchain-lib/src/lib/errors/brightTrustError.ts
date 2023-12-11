import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { BrightTrustErrorType } from '../enumerations/brightTrustErrorType';
import { TypedError } from './typedError';

export class BrightTrustError extends TypedError<BrightTrustErrorType> {
  public get reasonMap(): Record<BrightTrustErrorType, BrightChainStringKey> {
    return {
      // Existing error types
      [BrightTrustErrorType.InvalidBrightTrustId]:
        BrightChainStrings.Error_BrightTrustError_InvalidBrightTrustId,
      [BrightTrustErrorType.DocumentNotFound]:
        BrightChainStrings.Error_BrightTrustError_DocumentNotFound,
      [BrightTrustErrorType.UnableToRestoreDocument]:
        BrightChainStrings.Error_BrightTrustError_UnableToRestoreDocument,
      [BrightTrustErrorType.NotImplemented]:
        BrightChainStrings.Error_BrightTrustError_NotImplemented,
      [BrightTrustErrorType.Uninitialized]:
        BrightChainStrings.Error_BrightTrustError_Uninitialized,
      [BrightTrustErrorType.MemberNotFound]:
        BrightChainStrings.Error_BrightTrustError_MemberNotFound,
      [BrightTrustErrorType.NotEnoughMembers]:
        BrightChainStrings.Error_BrightTrustError_NotEnoughMembers,
      // Mode errors
      [BrightTrustErrorType.TransitionInProgress]:
        BrightChainStrings.Error_BrightTrustError_TransitionInProgress,
      [BrightTrustErrorType.InvalidModeTransition]:
        BrightChainStrings.Error_BrightTrustError_InvalidModeTransition,
      [BrightTrustErrorType.InsufficientMembersForTransition]:
        BrightChainStrings.Error_BrightTrustError_InsufficientMembersForTransition,
      // Member management errors
      [BrightTrustErrorType.MemberAlreadyExists]:
        BrightChainStrings.Error_BrightTrustError_MemberAlreadyExists,
      [BrightTrustErrorType.InsufficientRemainingMembers]:
        BrightChainStrings.Error_BrightTrustError_InsufficientRemainingMembers,
      [BrightTrustErrorType.MemberBanned]:
        BrightChainStrings.Error_BrightTrustError_MemberBanned,
      [BrightTrustErrorType.MemberSuspended]:
        BrightChainStrings.Error_BrightTrustError_MemberSuspended,
      // Proposal/voting errors
      [BrightTrustErrorType.DuplicateProposal]:
        BrightChainStrings.Error_BrightTrustError_DuplicateProposal,
      [BrightTrustErrorType.ProposalExpired]:
        BrightChainStrings.Error_BrightTrustError_ProposalExpired,
      [BrightTrustErrorType.DuplicateVote]:
        BrightChainStrings.Error_BrightTrustError_DuplicateVote,
      [BrightTrustErrorType.VoterNotOnProposal]:
        BrightChainStrings.Error_BrightTrustError_VoterNotOnProposal,
      [BrightTrustErrorType.AuthenticationFailed]:
        BrightChainStrings.Error_BrightTrustError_AuthenticationFailed,
      [BrightTrustErrorType.VotingLocked]:
        BrightChainStrings.Error_BrightTrustError_VotingLocked,
      [BrightTrustErrorType.MissingAttachment]:
        BrightChainStrings.Error_BrightTrustError_MissingAttachment,
      [BrightTrustErrorType.AttachmentNotRetrievable]:
        BrightChainStrings.Error_BrightTrustError_AttachmentNotRetrievable,
      // Share redistribution errors
      [BrightTrustErrorType.RedistributionFailed]:
        BrightChainStrings.Error_BrightTrustError_RedistributionFailed,
      [BrightTrustErrorType.InsufficientSharesForReconstruction]:
        BrightChainStrings.Error_BrightTrustError_InsufficientSharesForReconstruction,
      [BrightTrustErrorType.KeyReconstructionValidationFailed]:
        BrightChainStrings.Error_BrightTrustError_KeyReconstructionValidationFailed,
      // Identity errors
      [BrightTrustErrorType.IdentityPermanentlyUnrecoverable]:
        BrightChainStrings.Error_BrightTrustError_IdentityPermanentlyUnrecoverable,
      [BrightTrustErrorType.InvalidMembershipProof]:
        BrightChainStrings.Error_BrightTrustError_InvalidMembershipProof,
      [BrightTrustErrorType.MissingMembershipProof]:
        BrightChainStrings.Error_BrightTrustError_MissingMembershipProof,
      [BrightTrustErrorType.AliasAlreadyTaken]:
        BrightChainStrings.Error_BrightTrustError_AliasAlreadyTaken,
      [BrightTrustErrorType.AliasNotFound]:
        BrightChainStrings.Error_BrightTrustError_AliasNotFound,
      [BrightTrustErrorType.AliasInactive]:
        BrightChainStrings.Error_BrightTrustError_AliasInactive,
      [BrightTrustErrorType.IdentitySealingFailed]:
        BrightChainStrings.Error_BrightTrustError_IdentitySealingFailed,
      [BrightTrustErrorType.ShardVerificationFailed]:
        BrightChainStrings.Error_BrightTrustError_ShardVerificationFailed,
      // Database errors
      [BrightTrustErrorType.BrightTrustDatabaseUnavailable]:
        BrightChainStrings.Error_BrightTrustError_BrightTrustDatabaseUnavailable,
      [BrightTrustErrorType.TransactionFailed]:
        BrightChainStrings.Error_BrightTrustError_TransactionFailed,
      // Audit errors
      [BrightTrustErrorType.AuditChainCorrupted]:
        BrightChainStrings.Error_BrightTrustError_AuditChainCorrupted,
      // Ban mechanism errors
      [BrightTrustErrorType.CannotBanSelf]:
        BrightChainStrings.Error_BrightTrustError_CannotBanSelf,
      [BrightTrustErrorType.MemberAlreadyBanned]:
        BrightChainStrings.Error_BrightTrustError_MemberAlreadyBanned,
      [BrightTrustErrorType.MemberNotBanned]:
        BrightChainStrings.Error_BrightTrustError_MemberNotBanned,
      [BrightTrustErrorType.NewMemberCannotProposeBan]:
        BrightChainStrings.Error_BrightTrustError_NewMemberCannotProposeBan,
      [BrightTrustErrorType.BanCoolingPeriodNotElapsed]:
        BrightChainStrings.Error_BrightTrustError_BanCoolingPeriodNotElapsed,
      [BrightTrustErrorType.InvalidBanRecordSignatures]:
        BrightChainStrings.Error_BrightTrustError_InvalidBanRecordSignatures,
    };
  }
  constructor(type: BrightTrustErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'QuorumError';
  }
}
