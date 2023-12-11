/**
 * User-related API response interfaces for BrightDB-backed applications.
 *
 * These extend IApiMessageResponse from the upstream node-express-suite
 * with BrightChain-specific data structures from brightchain-lib.
 */

import type {
  IAuthResponse,
  IBackupCodesResponseData,
  ICodeCountResponseData,
  IPasswordChangeResponse,
  IRecoveryResponse,
  IRequestUserResponseData,
  IUserProfile,
} from '@brightchain/brightchain-lib';
import type { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for successful login operations.
 * When TOTP is required, `user`, `token`, and `serverPublicKey` are absent
 * and `pendingTotpToken` is present instead.
 */
export interface IApiLoginResponse extends IApiMessageResponse {
  user?: IRequestUserDTO;
  token?: string;
  serverPublicKey?: string;
  /** Present when the user has TOTP enabled and must complete verification. */
  pendingTotpToken?: string;
}

/** API response for TOTP setup/reset — returns provisioning URI and raw secret. */
export interface IApiTotpSetupResponse extends IApiMessageResponse {
  provisioningUri: string;
  secret: string;
}

/** API response containing user settings, including TOTP status. */
export interface IApiUserSettingsResponse extends IApiMessageResponse {
  settings: {
    email: string;
    timezone: string;
    currency: string;
    siteLanguage: string;
    darkMode: boolean;
    directChallenge: boolean;
    displayName?: string;
    totpEnabled: boolean;
  };
}

/** API response containing user information */
export interface IApiRequestUserResponse
  extends IApiMessageResponse,
    IRequestUserResponseData {}

/** API response for backup codes operations */
export interface IApiBackupCodesResponse
  extends IApiMessageResponse,
    IBackupCodesResponseData {}

/** API response for backup code count operations */
export interface IApiCodeCountResponse
  extends IApiMessageResponse,
    ICodeCountResponseData {}

/** API response for password change operations */
export interface IApiPasswordChangeResponse extends IApiMessageResponse {
  data: IPasswordChangeResponse<string>;
}

/** API response for mnemonic-based account recovery operations */
export interface IApiRecoveryResponse extends IApiMessageResponse {
  data: IRecoveryResponse<string>;
}

/** API response for user profile retrieval */
export interface IUserProfileApiResponse extends IApiMessageResponse {
  data: IUserProfile<string>;
}

/** API response for authentication operations (login/register) */
export interface IAuthApiResponse extends IApiMessageResponse {
  data: IAuthResponse<string>;
}

/** API response containing user information */
export interface IApiRequestUserResponse
  extends IApiMessageResponse,
    IRequestUserResponseData {}

/** API response for backup codes operations */
export interface IApiBackupCodesResponse
  extends IApiMessageResponse,
    IBackupCodesResponseData {}

/** API response for backup code count operations */
export interface IApiCodeCountResponse
  extends IApiMessageResponse,
    ICodeCountResponseData {}

/** API response for password change operations */
export interface IApiPasswordChangeResponse extends IApiMessageResponse {
  data: IPasswordChangeResponse<string>;
}

/** API response for mnemonic-based account recovery operations */
export interface IApiRecoveryResponse extends IApiMessageResponse {
  data: IRecoveryResponse<string>;
}

/** API response for user profile retrieval */
export interface IUserProfileApiResponse extends IApiMessageResponse {
  data: IUserProfile<string>;
}

/** API response for authentication operations (login/register) */
export interface IAuthApiResponse extends IApiMessageResponse {
  data: IAuthResponse<string>;
}
