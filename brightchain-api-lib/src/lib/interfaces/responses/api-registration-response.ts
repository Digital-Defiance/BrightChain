import { SecureString } from '@digitaldefiance/ecies-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for successful user registration
 */
export interface IApiRegistrationResponse extends IApiMessageResponse {
  /**
   * The user's mnemonic phrase for account recovery
   */
  mnemonic: string;
  
  /**
   * Array of backup codes for account recovery
   */
  backupCodes: SecureString[];
}
