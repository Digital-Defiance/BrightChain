import { SecureString } from '@digitaldefiance/ecies-lib';

/**
 * Platform-agnostic base data interface for successful user registration responses.
 * Used by both frontend and backend consumers.
 */
export interface IRegistrationResponseData {
  /**
   * The user's mnemonic phrase for account recovery
   */
  mnemonic: string;

  /**
   * Array of backup codes for account recovery
   */
  backupCodes: SecureString[];
}
