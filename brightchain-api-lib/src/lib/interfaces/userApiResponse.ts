import { IAuthResponse, IUserProfile } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for user profile retrieval.
 * Wraps the shared IUserProfile DTO with the standard API message envelope.
 */
export interface IUserProfileApiResponse extends IApiMessageResponse {
  data: IUserProfile<string>;
}

/**
 * API response for authentication operations (login/register).
 * Wraps the shared IAuthResponse DTO with the standard API message envelope.
 */
export interface IAuthApiResponse extends IApiMessageResponse {
  data: IAuthResponse<string>;
}
