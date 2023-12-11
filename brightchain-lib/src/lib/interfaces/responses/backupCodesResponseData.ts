/**
 * Platform-agnostic base data interface for backup codes responses.
 * Used by both frontend and backend consumers.
 * Matches express-suite IApiBackupCodesResponse shape (minus IApiMessageResponse).
 */
export interface IBackupCodesResponseData {
  backupCodes: Array<string>;
}
