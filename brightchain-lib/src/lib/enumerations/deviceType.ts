/**
 * Device type enumeration for the BrightChain identity system.
 * Defines the category of a provisioned device.
 *
 * Requirements: 3.7
 */

export enum DeviceType {
  /** Desktop application (Windows, macOS, Linux) */
  DESKTOP = 'desktop',

  /** Mobile application (iOS, Android) */
  MOBILE = 'mobile',

  /** Web browser client */
  WEB = 'web',
}
