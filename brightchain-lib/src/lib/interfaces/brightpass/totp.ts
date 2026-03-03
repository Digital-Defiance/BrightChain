/**
 * A generated TOTP code with countdown information.
 */
export interface ITotpCode {
  /** The current 6-digit TOTP code. */
  code: string;
  /** Seconds remaining until the next code refresh. */
  remainingSeconds: number;
  /** The TOTP period in seconds (typically 30). */
  period: number;
}

/**
 * Result of validating a TOTP code against a secret.
 */
export interface ITotpValidation {
  /** Whether the submitted code is valid. */
  valid: boolean;
}
