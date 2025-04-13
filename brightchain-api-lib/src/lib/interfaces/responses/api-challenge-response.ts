import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for login challenge generation
 */
export interface IApiChallengeResponse extends IApiMessageResponse {
  /**
   * The generated challenge string
   */
  challenge: string;
}
