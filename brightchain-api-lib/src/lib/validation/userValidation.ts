/**
 * Validation utilities for user endpoint request bodies.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

export interface IValidationError {
  field: string;
  message: string;
}

export interface IValidationResult {
  valid: boolean;
  errors: IValidationError[];
}

/**
 * Validates a registration request body.
 * - username: non-empty, alphanumeric/hyphens/underscores only
 * - email: valid email format
 * - password: minimum 8 characters
 */
export function validateRegistration(body: unknown): IValidationResult {
  const errors: IValidationError[] = [];
  const data = body as Record<string, unknown>;

  const username = data['username'];
  const email = data['email'];
  const password = data['password'];

  if (
    !username ||
    typeof username !== 'string' ||
    username.trim().length === 0
  ) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push({
      field: 'username',
      message:
        'Username must contain only alphanumeric characters, hyphens, and underscores',
    });
  }

  if (!email || typeof email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Email format is invalid' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a login request body.
 * - username: non-empty
 * - password: non-empty
 */
export function validateLogin(body: unknown): IValidationResult {
  const errors: IValidationError[] = [];
  const data = body as Record<string, unknown>;

  const username = data['username'];
  const password = data['password'];

  if (
    !username ||
    typeof username !== 'string' ||
    username.trim().length === 0
  ) {
    errors.push({ field: 'username', message: 'Username is required' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a password change request body.
 * - currentPassword: non-empty string
 * - newPassword: minimum 8 characters
 *
 * Requirements: 1.3, 5.7
 */
export function validatePasswordChange(body: unknown): IValidationResult {
  const errors: IValidationError[] = [];
  const data = body as Record<string, unknown>;

  const currentPassword = data['currentPassword'];
  const newPassword = data['newPassword'];

  if (
    !currentPassword ||
    typeof currentPassword !== 'string' ||
    currentPassword.trim().length === 0
  ) {
    errors.push({
      field: 'currentPassword',
      message: 'Current password is required',
    });
  }

  if (!newPassword || typeof newPassword !== 'string') {
    errors.push({
      field: 'newPassword',
      message: 'New password is required',
    });
  } else if (newPassword.length < 8) {
    errors.push({
      field: 'newPassword',
      message: 'New password must be at least 8 characters',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a mnemonic recovery request body.
 * - email: valid email format
 * - mnemonic: non-empty string
 * - newPassword (optional): if present, minimum 8 characters
 *
 * Requirements: 5.7
 */
export function validateRecovery(body: unknown): IValidationResult {
  const errors: IValidationError[] = [];
  const data = body as Record<string, unknown>;

  const email = data['email'];
  const mnemonic = data['mnemonic'];
  const newPassword = data['newPassword'];

  if (!email || typeof email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Email format is invalid' });
  }

  if (
    !mnemonic ||
    typeof mnemonic !== 'string' ||
    mnemonic.trim().length === 0
  ) {
    errors.push({ field: 'mnemonic', message: 'Mnemonic is required' });
  }

  if (newPassword !== undefined && newPassword !== null) {
    if (typeof newPassword !== 'string') {
      errors.push({
        field: 'newPassword',
        message: 'New password must be a string',
      });
    } else if (newPassword.length < 8) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be at least 8 characters',
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
