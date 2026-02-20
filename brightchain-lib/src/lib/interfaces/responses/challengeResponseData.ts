/**
 * Platform-agnostic base data interface for login challenge generation responses.
 * Used by both frontend and backend consumers.
 */
export interface IChallengeResponseData {
  /**
   * The generated challenge string
   */
  challenge: string;
}
