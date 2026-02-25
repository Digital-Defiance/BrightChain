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
 * The plaintext code is never persisted — only its bcrypt hash.
 */
export interface IStoredBackupCode {
  /** bcrypt hash of the plaintext code */
  hash: string;
  /** true once the code has been consumed */
  used: boolean;
  /** epoch ms when the code was generated */
  createdAt: number;
}
