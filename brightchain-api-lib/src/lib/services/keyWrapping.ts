import {
  SecureBuffer,
} from '@digitaldefiance/node-ecies-lib';
import {
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import { AppConstants } from '../appConstants';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { Constants } from '../constants';
import { Pbkdf2Service } from './pbkdf2';

export interface WrappedKey {
  salt: string;
  iv: string;
  authTag: string;
  encryptedMasterKey: string;
  iterations: number;
}

// Generic password-wrapped secret payload shape
export interface PasswordWrappedSecret {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  iterations: number;
}

export class KeyWrappingService {
  // In-flight de-duplication map to share PBKDF2 work across concurrent identical requests
  // Store a promise of the raw master key bytes, so each caller can get an independent SecureBuffer
  private static inFlightUnwraps: Map<string, Promise<string>> = new Map();

  /**
   * Generates a new master key and wraps it with the user's password
   */
  public wrapNewMasterKey(password: SecureString): {
    masterKey: SecureBuffer;
    wrappedKey: WrappedKey;
  } {
    const masterKey = new SecureBuffer(
      randomBytes(Constants.WRAPPED_KEY.MASTER_KEY_SIZE),
    );
    const wrappedKey = this.wrapMasterKey(masterKey, password);
    return { masterKey, wrappedKey };
  }

  /**
   * Wraps an existing master key with a password-derived key
   */
  public wrapMasterKey(
    masterKey: SecureBuffer,
    password: SecureString,
  ): WrappedKey {
    if (AppConstants.PasswordRegex.test(password.value ?? '') === false) {
      throw new HandleableError(new Error(SuiteCoreStringKey.Validation_InvalidCredentials));
    }
    const salt = randomBytes(Constants.WRAPPED_KEY.SALT_SIZE);
    const iterations = Constants.WRAPPED_KEY.MIN_ITERATIONS;

    // Derive key from password using centralized PBKDF2 service
    const derivedKey = Pbkdf2Service.deriveKeyFromPassword(
      Buffer.from(password.value ?? ""),
      salt,
      iterations,
      Constants.WRAPPED_KEY.SALT_SIZE,
      32, // AES-256 key size
      'sha256', // Keep existing algorithm for compatibility
    );
    const passwordKeySecure = new SecureBuffer(derivedKey.hash);

    // Encrypt master key
    const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
    const cipher = createCipheriv('aes-256-gcm', passwordKeySecure.value, iv);

    const encrypted = Buffer.concat([
      cipher.update(masterKey.value),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    passwordKeySecure.dispose();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedMasterKey: encrypted.toString('hex'),
      iterations,
    };
  }

  /**
   * Unwraps a master key using the user's password
   */
  public unwrapMasterKey(
    wrappedKey: WrappedKey,
    password: SecureString,
  ): SecureBuffer {
    const salt = Buffer.from(wrappedKey.salt, 'hex');
    const iv = Buffer.from(wrappedKey.iv, 'hex');
    const authTag = Buffer.from(wrappedKey.authTag, 'hex');
    const encrypted = Buffer.from(wrappedKey.encryptedMasterKey, 'hex');

    // Derive the same key from password using centralized PBKDF2 service
    const derivedKey = Pbkdf2Service.deriveKeyFromPassword(
      Buffer.from(password.value ?? ""),
      salt,
      wrappedKey.iterations,
      salt.length, // Use actual salt size
      32, // AES-256 key size
      'sha256', // Keep existing algorithm for compatibility
    );
    const passwordKeySecure = new SecureBuffer(derivedKey.hash);

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        passwordKeySecure.value,
        iv,
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return new SecureBuffer(decrypted);
    } catch {
      throw new HandleableError(new Error(SuiteCoreStringKey.Validation_InvalidCredentials));
    } finally {
      passwordKeySecure.dispose();
    }
  }

  /**
   * Async version of unwrapMasterKey that uses libuv threadpool via crypto.pbkdf2
   * to avoid blocking the event loop during password verification.
   */
  public async unwrapMasterKeyAsync(
    wrappedKey: WrappedKey,
    password: SecureString | string,
  ): Promise<SecureBuffer> {
    const __perfEnabled = process.env['PERF_LOGS'] === '1';
    const _t0 = __perfEnabled ? Date.now() : 0;
    const salt = Buffer.from(wrappedKey.salt, 'hex');
    const iv = Buffer.from(wrappedKey.iv, 'hex');
    const authTag = Buffer.from(wrappedKey.authTag, 'hex');
    const encrypted = Buffer.from(wrappedKey.encryptedMasterKey, 'hex');

    // Accept either a SecureString (preferred) or a raw password string to avoid
    // expensive SecureString construction in the hot login path.
    const pwdBuffer =
      typeof password === 'string'
        ? Buffer.from(password, 'utf8')
        : Buffer.from(password.value ?? "");

    // Use centralized PBKDF2 service for async key derivation
    const derivedKey = await Pbkdf2Service.deriveKeyFromPasswordAsync(
      pwdBuffer,
      salt,
      wrappedKey.iterations,
      salt.length, // Use actual salt size
      32, // AES-256 key size
      'sha256', // Keep existing algorithm for compatibility
    );
    const passwordKeySecure = new SecureBuffer(derivedKey.hash);

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        passwordKeySecure.value,
        iv,
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      if (__perfEnabled)
        console.warn(
          '[perf] unwrapMasterKeyAsync pbkdf2 iters=',
          wrappedKey.iterations,
          'dt=',
          Date.now() - _t0,
          'ms',
        );

      return new SecureBuffer(decrypted);
    } catch {
      throw new HandleableError(new Error(SuiteCoreStringKey.Validation_InvalidCredentials));
    } finally {
      // Best-effort zero the temporary password buffer
      try {
        pwdBuffer.fill(0);
      } catch {
        // ignore
      }
      passwordKeySecure.dispose();
    }
  }

  /**
   * Deduplicated async unwrap that coalesces concurrent identical PBKDF2 operations.
   * Keyed by salt + iterations + a short hash of the password. Entry is removed after resolve/reject.
   */
  public async unwrapMasterKeyAsyncDedup(
    wrappedKey: WrappedKey,
    password: string,
  ): Promise<SecureBuffer> {
    // Derive a short cache key; avoid storing raw password by hashing
    const pwdKey = createHash('sha256')
      .update(password, 'utf8')
      .digest('base64url')
      .slice(0, 24);
    const cacheKey = `${wrappedKey.salt}:${wrappedKey.iterations}:${pwdKey}`;
    let p = KeyWrappingService.inFlightUnwraps.get(cacheKey);
    if (!p) {
      // Compute once, extract raw bytes, dispose the shared SecureBuffer, and cache the bytes
      p = (async () => {
        const mk = await this.unwrapMasterKeyAsync(wrappedKey, password);
        try {
          const copy = Buffer.from(mk.value);
          const b64 = copy.toString('base64');
          // zeroize copy
          copy.fill(0);
          return b64;
        } finally {
          mk.dispose();
        }
      })().finally(() => {
        // Best-effort cleanup
        KeyWrappingService.inFlightUnwraps.delete(cacheKey);
      }) as Promise<string>;
      KeyWrappingService.inFlightUnwraps.set(cacheKey, p);
    }
    const b64 = await p;
    // Return a fresh SecureBuffer per caller to avoid cross-disposal races
    const buf = Buffer.from(b64, 'base64');
    const secure = new SecureBuffer(Buffer.from(buf));
    buf.fill(0);
    return secure;
  }

  /**
   * Changes password by re-wrapping the master key
   */
  public changePassword(
    wrappedKey: WrappedKey,
    oldPassword: SecureString,
    newPassword: SecureString,
  ): WrappedKey {
    // Unwrap with old password
    const masterKey = this.unwrapMasterKey(wrappedKey, oldPassword);

    try {
      // Re-wrap with new password
      return this.wrapMasterKey(masterKey, newPassword);
    } catch (error: unknown) {
      throw error;
    } finally {
      masterKey.dispose();
    }
  }

  /**
   * Wraps arbitrary secret bytes with a password-derived key (AES-256-GCM)
   */
  public wrapSecret(
    secret: SecureBuffer,
    password: SecureString,
  ): PasswordWrappedSecret {
    if (AppConstants.PasswordRegex.test(password.value ?? '') === false) {
      throw new HandleableError(new Error(SuiteCoreStringKey.Validation_InvalidCredentials));
    }
    const salt = randomBytes(Constants.WRAPPED_KEY.SALT_SIZE);
    const iterations = Constants.WRAPPED_KEY.MIN_ITERATIONS;

    // Derive key from password using centralized PBKDF2 service
    const derivedKey = Pbkdf2Service.deriveKeyFromPassword(
      Buffer.from(password.value ?? ""),
      salt,
      iterations,
      Constants.WRAPPED_KEY.SALT_SIZE,
      32, // AES-256 key size
      'sha256', // Keep existing algorithm for compatibility
    );
    const passwordKeySecure = new SecureBuffer(derivedKey.hash);

    try {
      const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
      const cipher = createCipheriv('aes-256-gcm', passwordKeySecure.value, iv);
      const encrypted = Buffer.concat([
        cipher.update(secret.value),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        ciphertext: encrypted.toString('hex'),
        iterations,
      };
    } finally {
      passwordKeySecure.dispose();
    }
  }

  /**
   * Unwraps a password-wrapped secret (sync)
   */
  public unwrapSecret(
    wrapped: PasswordWrappedSecret,
    password: SecureString,
  ): SecureBuffer {
    const salt = Buffer.from(wrapped.salt, 'hex');
    const iv = Buffer.from(wrapped.iv, 'hex');
    const authTag = Buffer.from(wrapped.authTag, 'hex');
    const encrypted = Buffer.from(wrapped.ciphertext, 'hex');

    // Derive key from password using centralized PBKDF2 service
    const derivedKey = Pbkdf2Service.deriveKeyFromPassword(
      Buffer.from(password.value ?? ""),
      salt,
      wrapped.iterations,
      salt.length, // Use actual salt size
      32, // AES-256 key size
      'sha256', // Keep existing algorithm for compatibility
    );
    const passwordKeySecure = new SecureBuffer(derivedKey.hash);
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        passwordKeySecure.value,
        iv,
      );
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return new SecureBuffer(decrypted);
    } catch {
      throw new HandleableError(new Error(SuiteCoreStringKey.Validation_InvalidCredentials));
    } finally {
      passwordKeySecure.dispose();
    }
  }

  /**
   * Unwraps a password-wrapped secret (async PBKDF2)
   */
  public async unwrapSecretAsync(
    wrapped: PasswordWrappedSecret,
    password: SecureString | string,
  ): Promise<SecureBuffer> {
    const salt = Buffer.from(wrapped.salt, 'hex');
    const iv = Buffer.from(wrapped.iv, 'hex');
    const authTag = Buffer.from(wrapped.authTag, 'hex');
    const encrypted = Buffer.from(wrapped.ciphertext, 'hex');

    // Validate password parameter before using it
    if (typeof password === 'string') {
      if (password === undefined || password === null) {
        throw new Error('Password cannot be undefined or null');
      }
    } else if (!(password instanceof SecureString)) {
      throw new Error('Password must be provided as string or SecureString');
    }

    const pwdBuffer =
      typeof password === 'string'
        ? Buffer.from(password, 'utf8')
        : Buffer.from(password.value ?? '');

    // Additional safety check
    if (!pwdBuffer) {
      throw new Error(
        'Failed to create password buffer - password may be invalid',
      );
    }

    // Use centralized PBKDF2 service for async key derivation
    const derivedKey = await Pbkdf2Service.deriveKeyFromPasswordAsync(
      Buffer.from(pwdBuffer),
      salt,
      wrapped.iterations,
      salt.length, // Use actual salt size
      32, // AES-256 key size
      'sha256', // Keep existing algorithm for compatibility
    );
    const passwordKeySecure = new SecureBuffer(derivedKey.hash);
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        passwordKeySecure.value,
        iv,
      );
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return new SecureBuffer(decrypted);
    } catch {
      throw new HandleableError(new Error(SuiteCoreStringKey.Validation_InvalidCredentials));
    } finally {
      try {
        pwdBuffer.fill(0);
      } catch {
        // ignore
      }
      passwordKeySecure.dispose();
    }
  }
}
