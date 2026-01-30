import {
  EciesStringKey,
  EciesStringKeyValue,
} from '@digitaldefiance/ecies-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import { SuiteCoreStringKey, SuiteCoreStringKeyValue } from '@digitaldefiance/suite-core-lib';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { MemberErrorType } from '../enumerations/memberErrorType';

export class MemberError extends HandleableError {
  public readonly type: MemberErrorType;

  public get reasonMap(): Record<
    MemberErrorType,
    BrightChainStringKey | EciesStringKeyValue | SuiteCoreStringKeyValue
  > {
    return {
      [MemberErrorType.IncorrectOrInvalidPrivateKey]:
        EciesStringKey.Error_MemberError_IncorrectOrInvalidPrivateKey,
      [MemberErrorType.InvalidEmail]:
        EciesStringKey.Error_MemberError_InvalidEmail,
      [MemberErrorType.InvalidEmailWhitespace]:
        EciesStringKey.Error_MemberError_InvalidEmailWhitespace,
      [MemberErrorType.InvalidMemberName]:
        EciesStringKey.Error_MemberError_InvalidMemberName,
      [MemberErrorType.InvalidMemberStatus]:
        EciesStringKey.Error_MemberError_InvalidMemberStatus,
      [MemberErrorType.InvalidMemberNameWhitespace]:
        EciesStringKey.Error_MemberError_InvalidMemberNameWhitespace,
      [MemberErrorType.InvalidMnemonic]:
        EciesStringKey.Error_MemberError_InvalidMnemonic,
      [MemberErrorType.MissingEmail]:
        EciesStringKey.Error_MemberError_MissingEmail,
      [MemberErrorType.MemberAlreadyExists]:
        EciesStringKey.Error_MemberError_MemberAlreadyExists,
      [MemberErrorType.MissingMemberName]:
        EciesStringKey.Error_MemberError_MissingMemberName,
      [MemberErrorType.MemberNotFound]:
        EciesStringKey.Error_MemberError_MemberNotFound,
      [MemberErrorType.MissingVotingPrivateKey]:
        SuiteCoreStringKey.Error_MemberErrorMissingVotingPrivateKey,
      [MemberErrorType.MissingVotingPublicKey]:
        SuiteCoreStringKey.Error_MemberErrorMissingVotingPublicKey,
      [MemberErrorType.MissingPrivateKey]:
        EciesStringKey.Error_MemberError_MissingPrivateKey,
      [MemberErrorType.NoWallet]: EciesStringKey.Error_MemberError_NoWallet,
      [MemberErrorType.PrivateKeyRequiredToDeriveVotingKeyPair]:
        BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair,
      [MemberErrorType.WalletAlreadyLoaded]:
        EciesStringKey.Error_MemberError_WalletAlreadyLoaded,
      [MemberErrorType.InsufficientRandomBlocks]:
        BrightChainStrings.Error_MemberError_InsufficientRandomBlocks,
      [MemberErrorType.FailedToCreateMemberBlocks]:
        BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks,
      [MemberErrorType.FailedToHydrateMember]:
        EciesStringKey.Error_MemberError_FailedToHydrateMember,
      [MemberErrorType.InvalidMemberData]:
        EciesStringKey.Error_MemberError_InvalidMemberData,
      [MemberErrorType.FailedToConvertMemberData]:
        EciesStringKey.Error_MemberError_FailedToConvertMemberData,
      [MemberErrorType.InvalidMemberBlocks]:
        BrightChainStrings.Error_MemberError_InvalidMemberBlocks,
      [MemberErrorType.MissingEncryptionData]:
        EciesStringKey.Error_MemberError_MissingEncryptionData,
      [MemberErrorType.EncryptionDataTooLarge]:
        EciesStringKey.Error_MemberError_EncryptionDataTooLarge,
      [MemberErrorType.InvalidEncryptionData]:
        EciesStringKey.Error_MemberError_InvalidEncryptionData,
    };
  }
  constructor(type: MemberErrorType, _language?: string) {
    // Temporarily bypass translation to avoid i18n initialization issues
    const message =
      type === MemberErrorType.FailedToCreateMemberBlocks
        ? 'Failed to create member blocks.'
        : `Member error: ${type}`;
    super(new Error(message));
    this.type = type;
    this.name = 'MemberError';
  }
}
