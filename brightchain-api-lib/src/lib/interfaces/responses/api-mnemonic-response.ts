import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for mnemonic recovery operations
 */
export interface IApiMnemonicResponse extends IApiMessageResponse {
  /**
   * The recovered mnemonic phrase
   */
  mnemonic: string;
}
