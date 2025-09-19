/**
 * PBKDF2 Profile Usage Examples
 *
 * This file demonstrates how to use the new PBKDF2 configuration profiles
 * for simplified and standardized key derivation across the system.
 */

import { Buffer } from 'buffer';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';
import { Pbkdf2Service } from '../services/pbkdf2';

export class Pbkdf2ProfileExamples {
  /**
   * Example: User authentication with high-security profile
   */
  static async authenticateUser(password: string): Promise<Buffer> {
    const passwordBuffer = Buffer.from(password, 'utf-8');

    // Use the predefined USER_LOGIN profile for consistent security
    const result = await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
      passwordBuffer,
      Pbkdf2ProfileEnum.USER_LOGIN,
    );

    return result.hash;
  }

  /**
   * Example: Key wrapping for secret storage
   */
  static wrapSecretKey(password: string, salt?: Buffer): Buffer {
    const passwordBuffer = Buffer.from(password, 'utf-8');

    // Use the optimized KEY_WRAPPING profile for performance
    const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
      passwordBuffer,
      Pbkdf2ProfileEnum.KEY_WRAPPING,
      salt,
    );

    return result.hash;
  }

  /**
   * Example: Backup code encryption
   */
  static encryptBackupCode(backupCode: string): Buffer {
    const codeBuffer = Buffer.from(backupCode, 'utf-8');

    // Use the BACKUP_CODES profile for consistency
    const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
      codeBuffer,
      Pbkdf2ProfileEnum.BACKUP_CODES,
    );

    return result.hash;
  }

  /**
   * Example: Ultra-secure operations for sensitive data
   */
  static deriveHighSecurityKey(password: string): Buffer {
    const passwordBuffer = Buffer.from(password, 'utf-8');

    // Use HIGH_SECURITY profile for maximum protection
    const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
      passwordBuffer,
      Pbkdf2ProfileEnum.HIGH_SECURITY,
    );

    return result.hash;
  }

  /**
   * Example: Fast derivation for testing
   */
  static deriveTestKey(password: string): Buffer {
    const passwordBuffer = Buffer.from(password, 'utf-8');

    // Use FAST_TEST profile for development/testing
    const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
      passwordBuffer,
      Pbkdf2ProfileEnum.FAST_TEST,
    );

    return result.hash;
  }

  /**
   * Migration example: Converting existing code to use profiles
   */
  static migrationExample() {
    const password = Buffer.from('example-password');
    const salt = Buffer.alloc(32); // 32-byte salt

    // OLD WAY: Manual parameter specification
    const oldResult = Pbkdf2Service.deriveKeyFromPassword(
      password,
      salt,
      100000, // iterations
      32, // salt bytes
      32, // key size
      'sha256', // algorithm
    );

    // NEW WAY: Using predefined profile
    const newResult = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
      password,
      Pbkdf2ProfileEnum.KEY_WRAPPING,
      salt,
    );

    // Results should be identical for KEY_WRAPPING profile
    console.log('Results match:', oldResult.hash.equals(newResult.hash));
  }
}
