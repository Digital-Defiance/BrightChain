import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { IdentityValidationErrorType } from '../enumerations/identityValidationErrorType';
import { TypedError } from './typedError';

export class IdentityValidationError extends TypedError<IdentityValidationErrorType> {
  public get reasonMap(): Record<
    IdentityValidationErrorType,
    BrightChainStringKey
  > {
    return {
      [IdentityValidationErrorType.InvalidSignature]:
        BrightChainStrings.Error_IdentityValidationError_InvalidSignature,
      [IdentityValidationErrorType.UnregisteredAlias]:
        BrightChainStrings.Error_IdentityValidationError_UnregisteredAlias,
      [IdentityValidationErrorType.InactiveAlias]:
        BrightChainStrings.Error_IdentityValidationError_InactiveAlias,
      [IdentityValidationErrorType.InvalidMembershipProof]:
        BrightChainStrings.Error_IdentityValidationError_InvalidMembershipProof,
      [IdentityValidationErrorType.MissingMembershipProof]:
        BrightChainStrings.Error_IdentityValidationError_MissingMembershipProof,
      [IdentityValidationErrorType.BannedUser]:
        BrightChainStrings.Error_IdentityValidationError_BannedUser,
      [IdentityValidationErrorType.SuspendedUser]:
        BrightChainStrings.Error_IdentityValidationError_SuspendedUser,
      [IdentityValidationErrorType.ShardVerificationFailed]:
        BrightChainStrings.Error_IdentityValidationError_ShardVerificationFailed,
    };
  }
  constructor(type: IdentityValidationErrorType, _language?: string) {
    super(type, undefined);
    this.name = 'IdentityValidationError';
  }
}
