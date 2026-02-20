import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';

/**
 * Platform-agnostic base data interface for user information responses.
 * Used by both frontend and backend consumers.
 */
export interface IRequestUserResponseData {
  /**
   * The user information
   */
  user: IRequestUserDTO;
}
