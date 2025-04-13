import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';

/**
 * API response for successful login operations
 */
export interface IApiLoginResponse extends IApiMessageResponse {
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
