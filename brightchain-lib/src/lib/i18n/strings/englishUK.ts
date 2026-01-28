import { StringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { AmericanEnglishStrings } from './englishUs';

export const BritishEnglishStrings: StringsCollection<BrightChainStrings> = {
  ...AmericanEnglishStrings,
  // Override spelling differences between British and American English

  // Service Provider Errors - "initialized" -> "initialised"
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider has not been initialised',

  // Block Service Errors - "initialized" -> "initialised"
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'BlockService subsystem already initialised',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'BlockService subsystem not initialised',

  // Quorum Error - "initialized" -> "initialised"
  [BrightChainStrings.Error_QuorumError_Uninitialized]:
    'Quorum subsystem not initialised',

  // Document Error - "initialized" -> "initialised"
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'Document subsystem is already initialised',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'Document subsystem is not initialised',
};
