/**
 * Platform-agnostic base data interface for backup code count query responses.
 * Used by both frontend and backend consumers.
 */
export interface ICodeCountResponseData {
  /**
   * Number of remaining backup codes
   */
  count: number;
}
