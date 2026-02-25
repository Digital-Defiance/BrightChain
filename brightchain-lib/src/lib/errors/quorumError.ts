import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { TypedError } from './typedError';

export class QuorumError extends TypedError<QuorumErrorType> {
  public get reasonMap(): Record<QuorumErrorType, BrightChainStringKey> {
    return {
      // Existing error types
      [QuorumErrorType.InvalidQuorumId]:
        BrightChainStrings.Error_QuorumError_InvalidQuorumId,
      [QuorumErrorType.DocumentNotFound]:
        BrightChainStrings.Error_QuorumError_DocumentNotFound,
      [QuorumErrorType.UnableToRestoreDocument]:
        BrightChainStrings.Error_QuorumError_UnableToRestoreDocument,
      [QuorumErrorType.NotImplemented]:
        BrightChainStrings.Error_QuorumError_NotImplemented,
      [QuorumErrorType.Uninitialized]:
        BrightChainStrings.Error_QuorumError_Uninitialized,
      [QuorumErrorType.MemberNotFound]:
        BrightChainStrings.Error_QuorumError_MemberNotFound,
      [QuorumErrorType.NotEnoughMembers]:
        BrightChainStrings.Error_QuorumError_NotEnoughMembers,
      // Mode errors
      [QuorumErrorType.TransitionInProgress]:
        BrightChainStrings.Error_QuorumError_TransitionInProgress,
      [QuorumErrorType.InvalidModeTransition]:
        BrightChainStrings.Error_QuorumError_InvalidModeTransition,
      [QuorumErrorType.InsufficientMembersForTransition]:
        BrightChainStrings.Error_QuorumError_InsufficientMembersForTransition,
      // Member management errors
      [QuorumErrorType.MemberAlreadyExists]:
        BrightChainStrings.Error_QuorumError_MemberAlreadyExists,
      [QuorumErrorType.InsufficientRemainingMembers]:
        BrightChainStrings.Error_QuorumError_InsufficientRemainingMembers,
      [QuorumErrorType.MemberBanned]:
        BrightChainStrings.Error_QuorumError_MemberBanned,
      [QuorumErrorType.MemberSuspended]:
        BrightChainStrings.Error_QuorumError_MemberSuspended,
      // Proposal/voting errors
      [QuorumErrorType.DuplicateProposal]:
        BrightChainStrings.Error_QuorumError_DuplicateProposal,
      [QuorumErrorType.ProposalExpired]:
        BrightChainStrings.Error_QuorumError_ProposalExpired,
      [QuorumErrorType.DuplicateVote]:
        BrightChainStrings.Error_QuorumError_DuplicateVote,
      [QuorumErrorType.VoterNotOnProposal]:
        BrightChainStrings.Error_QuorumError_VoterNotOnProposal,
      [QuorumErrorType.AuthenticationFailed]:
        BrightChainStrings.Error_QuorumError_AuthenticationFailed,
      [QuorumErrorType.VotingLocked]:
        BrightChainStrings.Error_QuorumError_VotingLocked,
      [QuorumErrorType.MissingAttachment]:
        BrightChainStrings.Error_QuorumError_MissingAttachment,
      [QuorumErrorType.AttachmentNotRetrievable]:
        BrightChainStrings.Error_QuorumError_AttachmentNotRetrievable,
      // Share redistribution errors
      [QuorumErrorType.RedistributionFailed]:
        BrightChainStrings.Error_QuorumError_RedistributionFailed,
      [QuorumErrorType.InsufficientSharesForReconstruction]:
        BrightChainStrings.Error_QuorumError_InsufficientSharesForReconstruction,
      [QuorumErrorType.KeyReconstructionValidationFailed]:
        BrightChainStrings.Error_QuorumError_KeyReconstructionValidationFailed,
      // Identity errors
      [QuorumErrorType.IdentityPermanentlyUnrecoverable]:
        BrightChainStrings.Error_QuorumError_IdentityPermanentlyUnrecoverable,
      [QuorumErrorType.InvalidMembershipProof]:
        BrightChainStrings.Error_QuorumError_InvalidMembershipProof,
      [QuorumErrorType.MissingMembershipProof]:
        BrightChainStrings.Error_QuorumError_MissingMembershipProof,
      [QuorumErrorType.AliasAlreadyTaken]:
        BrightChainStrings.Error_QuorumError_AliasAlreadyTaken,
      [QuorumErrorType.AliasNotFound]:
        BrightChainStrings.Error_QuorumError_AliasNotFound,
      [QuorumErrorType.AliasInactive]:
        BrightChainStrings.Error_QuorumError_AliasInactive,
      [QuorumErrorType.IdentitySealingFailed]:
        BrightChainStrings.Error_QuorumError_IdentitySealingFailed,
      [QuorumErrorType.ShardVerificationFailed]:
        BrightChainStrings.Error_QuorumError_ShardVerificationFailed,
      // Database errors
      [QuorumErrorType.QuorumDatabaseUnavailable]:
        BrightChainStrings.Error_QuorumError_QuorumDatabaseUnavailable,
      [QuorumErrorType.TransactionFailed]:
        BrightChainStrings.Error_QuorumError_TransactionFailed,
      // Audit errors
      [QuorumErrorType.AuditChainCorrupted]:
        BrightChainStrings.Error_QuorumError_AuditChainCorrupted,
    };
  }
  constructor(type: QuorumErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'QuorumError';
  }
}
