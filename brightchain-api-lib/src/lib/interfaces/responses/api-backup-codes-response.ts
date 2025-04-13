import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for backup code generation/reset operations
 */
export interface IApiBackupCodesResponse extends IApiMessageResponse {
  /**
   * Array of newly generated backup codes
   */
  backupCodes: string[];
}
