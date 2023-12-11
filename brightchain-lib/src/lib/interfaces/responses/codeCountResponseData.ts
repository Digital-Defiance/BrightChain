/**
 * Platform-agnostic base data interface for code count responses.
 * Used by both frontend and backend consumers.
 * Matches express-suite IApiCodeCountResponse shape (minus IApiMessageResponse).
 */
export interface ICodeCountResponseData {
  codeCount: number;
}
