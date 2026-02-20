/**
 * Platform-agnostic base data interface for mnemonic recovery responses.
 * Used by both frontend and backend consumers.
 */
export interface IMnemonicResponseData {
  /**
   * The recovered mnemonic phrase
   */
  mnemonic: string;
}
