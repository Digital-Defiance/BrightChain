/**
 * Platform-agnostic base data interface for backup code generation/reset responses.
 * Used by both frontend and backend consumers.
 */
export interface IBackupCodesResponseData {
  /**
   * Array of newly generated backup codes
   */
  backupCodes: string[];
}
