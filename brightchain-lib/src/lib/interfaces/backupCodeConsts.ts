/**
 * Constants for backup code generation and validation
 *
 * @remarks
 * Backup codes provide an alternative authentication method when primary
 * methods are unavailable. These constants control code generation and
 * validation patterns.
 *
 * @example
 * ```typescript
 * const backupCodeConsts: IBackupCodeConstants = {
 *   Count: 10,
 *   NormalizedHexRegex: /^[0-9a-f]{16}$/,
 *   DisplayRegex: /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/
 * };
 * ```
 */
export interface IBackupCodeConstants {
  /**
   * How many backup codes to generate for users
   * @remarks Typically 8-12 codes to provide sufficient backup options
   */
  Count: number;

  /**
   * Regular expression for validating normalized hex backup codes
   * @remarks Normalized codes are lowercase hex without separators
   */
  NormalizedHexRegex: RegExp;

  /**
   * Regular expression for validating display-formatted backup codes
   * @remarks Display codes typically include hyphens for readability
   */
  DisplayRegex: RegExp;
}
