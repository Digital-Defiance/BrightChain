import { IMnemonicResponseData } from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for mnemonic recovery operations
 */
export interface IApiMnemonicResponse
  extends IApiMessageResponse, IMnemonicResponseData {}
