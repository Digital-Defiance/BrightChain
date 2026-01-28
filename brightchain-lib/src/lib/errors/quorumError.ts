import BrightChainStrings from '../enumerations/brightChainStrings';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { TypedError } from './typedError';

export class QuorumError extends TypedError<QuorumErrorType> {
  public get reasonMap(): Record<QuorumErrorType, BrightChainStrings> {
    return {
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
    };
  }
  constructor(type: QuorumErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'QuorumError';
  }
}
