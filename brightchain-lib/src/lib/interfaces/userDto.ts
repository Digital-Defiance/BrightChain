/**
 * Shared user data interfaces — used by both frontend and backend.
 *
 * TID is the ID type: `string` for frontend / REST responses,
 * `Uint8Array` or `Checksum` for backend internals.
 */

/**
 * User profile data returned from the profile endpoint.
 */
export interface IUserProfile<TID = string> {
  memberId: TID;
  username: string;
  email: string;
  energyBalance: number;
  availableBalance: number;
  earned: number;
  spent: number;
  reserved: number;
  reputation: number;
  createdAt: string;
  lastUpdated: string;
  profile?: IUserProfileMetadata;
}

/**
 * Optional metadata section within a user profile response.
 */
export interface IUserProfileMetadata {
  status: string;
  storageQuota?: string;
  storageUsed?: string;
  lastActive?: string;
  dateCreated?: string;
}

/**
 * Auth response returned after registration or login.
 */
export interface IAuthResponse<TID = string> {
  token: string;
  memberId: TID;
  energyBalance: number;
}

/**
 * Registration request body.
 */
export interface IRegistrationRequest {
  username: string;
  email: string;
  password: string;
}

/**
 * Login request body.
 */
export interface ILoginRequest {
  username: string;
  password: string;
}
