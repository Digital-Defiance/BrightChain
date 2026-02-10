/**
 * Paper key purpose enumeration for the BrightChain identity system.
 * Defines the intended use of a paper key.
 *
 * Requirements: 1.5
 */

export enum PaperKeyPurpose {
  /** Paper key generated as an account backup */
  BACKUP = 'backup',

  /** Paper key used to provision a new device */
  DEVICE_PROVISIONING = 'device-provisioning',

  /** Paper key used for account recovery */
  RECOVERY = 'recovery',
}
