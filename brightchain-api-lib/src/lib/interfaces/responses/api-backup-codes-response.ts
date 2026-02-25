import { IBackupCodesResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for backup codes operations.
 */
export interface IApiBackupCodesResponse
  extends IApiMessageResponse, IBackupCodesResponseData {}
