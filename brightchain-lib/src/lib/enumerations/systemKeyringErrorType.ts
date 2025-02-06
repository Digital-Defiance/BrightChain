import { StringNames } from './stringNames';

export enum SystemKeyringErrorType {
  KeyNotFound = 'KeyNotFound',
  RateLimitExceeded = 'RateLimitExceeded',
}

export const SystemKeyringErrorTypes: {
  [key in SystemKeyringErrorType]: StringNames;
} = {
  [SystemKeyringErrorType.KeyNotFound]:
    StringNames.Error_SystemKeyringErrorKeyNotFoundTemplate,
  [SystemKeyringErrorType.RateLimitExceeded]:
    StringNames.Error_SystemKeyringErrorRateLimitExceeded,
};
