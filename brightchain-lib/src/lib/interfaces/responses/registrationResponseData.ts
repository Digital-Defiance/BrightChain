/**
 * Platform-agnostic base data interface for successful user registration responses.
 * Used by both frontend and backend consumers.
 * Matches express-suite IApiRegistrationResponse shape.
 */
export interface IRegistrationResponseData {
  /**
   * The user's mnemonic phrase for account recovery.
   * Only present when server-generated (user didn't provide their own).
   */
  mnemonic?: string;

  /**
   * Array of backup codes for account recovery
   */
  backupCodes: Array<string>;
}
