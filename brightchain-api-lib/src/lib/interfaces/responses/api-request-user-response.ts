import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';
import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';

/**
 * API response containing user information
 */
export interface IApiRequestUserResponse extends IApiMessageResponse {
  /**
   * The user information
   */
  user: IRequestUserDTO;
}
