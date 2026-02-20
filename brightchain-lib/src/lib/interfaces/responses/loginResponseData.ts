import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';

/**
 * Platform-agnostic base data interface for successful login responses.
 * Used by both frontend and backend consumers.
 */
export interface ILoginResponseData {
  /**
   * The authenticated user information
   */
  user: IRequestUserDTO;

  /**
   * JWT authentication token
   */
  token: string;

  /**
   * Server's public key for encryption
   */
  serverPublicKey: string;
}
