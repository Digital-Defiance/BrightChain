import { QuorumErrorType } from '../enumerations/quorumErrorType';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class QuorumError extends TypedError<QuorumErrorType> {
  public get reasonMap(): Record<QuorumErrorType, BrightChainStrings> {
    return {
      [QuorumErrorType.InvalidQuorumId]:
        BrightChainStrings.Error_QuorumErrorInvalidQuorumId,
      [QuorumErrorType.DocumentNotFound]:
        BrightChainStrings.Error_QuorumErrorDocumentNotFound,
      [QuorumErrorType.UnableToRestoreDocument]:
        BrightChainStrings.Error_QuorumErrorUnableToRestoreDocument,
      [QuorumErrorType.NotImplemented]:
        BrightChainStrings.Error_QuorumErrorNotImplemented,
      [QuorumErrorType.Uninitialized]:
        BrightChainStrings.Error_QuorumErrorUninitialized,
      [QuorumErrorType.MemberNotFound]:
        BrightChainStrings.Error_QuorumErrorMemberNotFound,
      [QuorumErrorType.NotEnoughMembers]:
        BrightChainStrings.Error_QuorumErrorNotEnoughMembers,
    };
  }
  constructor(type: QuorumErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'QuorumError';
  }
}
