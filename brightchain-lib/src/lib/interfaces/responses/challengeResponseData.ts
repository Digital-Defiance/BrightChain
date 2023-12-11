/**
 * Platform-agnostic base data interface for login challenge generation responses.
 * Used by both frontend and backend consumers.
 * Matches express-suite IApiChallengeResponse shape.
 */
export interface IChallengeResponseData {
  /**
   * The generated challenge string
   */
  challenge: string;

  /**
   * Server's public key for encrypting the response
   */
  serverPublicKey: string;
}
