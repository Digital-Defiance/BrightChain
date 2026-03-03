/**
 * Options for generating a cryptographically secure password.
 *
 * Follows the IBaseData<TData> workspace convention, though this interface
 * has no platform-specific ID fields — it is identical across frontend and backend.
 */
export interface IPasswordGenerationOptions {
  /** Password length, must be between 8 and 128 inclusive. */
  length: number;
  /** Include uppercase letters (A-Z). */
  uppercase: boolean;
  /** Include lowercase letters (a-z). */
  lowercase: boolean;
  /** Include digits (0-9). */
  digits: boolean;
  /** Include special characters (!@#$%^&* etc.). */
  symbols: boolean;
}

/** Strength classification for a generated password based on entropy. */
export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very_strong';

/**
 * Result of a password generation request.
 */
export interface IGeneratedPassword {
  /** The generated password string. */
  password: string;
  /** Estimated entropy in bits. */
  entropy: number;
  /** Strength classification derived from entropy. */
  strength: PasswordStrength;
}
