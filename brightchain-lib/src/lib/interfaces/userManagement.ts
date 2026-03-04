/**
 * Shared user management interfaces — used by both frontend and backend.
 *
 * TId is the ID type: `string` for frontend / REST responses,
 * `Uint8Array` for backend internals.
 */

/**
 * Password change request body.
 */
export interface IPasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password change response data.
 */
export interface IPasswordChangeResponse<TId = string> {
  memberId: TId;
  success: boolean;
}

/**
 * Mnemonic-based account recovery request body.
 */
export interface IRecoveryRequest {
  email: string;
  mnemonic: string;
  newPassword?: string;
}

/**
 * Mnemonic-based account recovery response data.
 */
export interface IRecoveryResponse<TId = string> {
  token: string;
  memberId: TId;
  passwordReset: boolean;
}

/**
 * A single stored backup code entry.
 * Matches the upstream IBackupCode shape from @digitaldefiance/suite-core-lib.
 * The plaintext code is never persisted — only its encrypted form.
 */
export interface IStoredBackupCode {
  /** Backup code scheme version (e.g. "1.0.0") */
  version: string;
  /** Hex-encoded random salt used for HKDF-SHA256 checksum and Argon2id KDF */
  checksumSalt: string;
  /** Hex-encoded HKDF-SHA256 checksum for constant-time validation */
  checksum: string;
  /** Hex-encoded ECIES-wrapped AEAD ciphertext of the user's private key */
  encrypted: string;
}
