export interface IBackupCodeConstants {
  /**
   * How many backup codes to generate for users
   */
  Count: number;
  /**
   * Regex for the backup codes
   * 32 lowercase alphanumeric character string (a-z0-9)
   */
  NormalizedHexRegex: RegExp;
  /**
   * Regex for the display format of the backup codes
   */
  DisplayRegex: RegExp; // xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
}
