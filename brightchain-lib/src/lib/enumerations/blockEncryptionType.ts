/**
 * Types of encrypted blocks
 */
export enum BlockEncryptionType {
  None = 0,
  /**
   * Single recipient encrypted block
   */
  SingleRecipient = 1,
  /**
   * Multi recipient encrypted block
   */
  MultiRecipient = 2,
}
