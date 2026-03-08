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
  ILoginResponseData,
  IPasswordChangeResponse,
  IRecoveryResponse,
  IRequestUserResponseData,
  IUserProfile,
} from '@brightchain/brightchain-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/** API response for successful login operations */
export interface IApiLoginResponse
  extends IApiMessageResponse,
    ILoginResponseData {}

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
