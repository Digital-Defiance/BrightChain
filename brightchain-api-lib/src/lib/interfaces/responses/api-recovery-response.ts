import { IRecoveryResponse } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/** API response for mnemonic-based account recovery operations */
export interface IApiRecoveryResponse extends IApiMessageResponse {
  data: IRecoveryResponse<string>;
}
