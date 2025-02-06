import { pbkdf2Sync, randomBytes } from 'crypto';
import { Pbkdf2ErrorType } from './enumerations/pbkdf2ErrorType';
import { Pbkdf2Error } from './errors/pbkdf2Error';
import { IPbkf2Config } from './interfaces/pbkdf2Config';
import { IPbkdf2Result } from './interfaces/pbkdf2Result';
import { StaticHelpersSymmetric } from './staticHelpers.symmetric';

/**
 * @description
 * Static helper functions for BrightChain and BrightChain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpersPbkdf2 {
  /**
   * Number of pbkdf2 iterations per second when hashing a password.
   */
  public static readonly Pbkdf2IterationsPerSecond: number = 1304000;

  /**
   * Generate an options object for pbkdf2
   * @param iterations
   * @returns
   */
  public static pbkdf2Config(iterations?: number): IPbkf2Config {
    // larger numbers mean better security, less
    return {
      // size of the generated hash
      hashBytes: StaticHelpersSymmetric.SymmetricKeyBytes,
      // larger salt means hashed passwords are more resistant to rainbow table, but
      // you get diminishing returns pretty fast
      saltBytes: 16,
      // more iterations means an attacker has to take longer to brute force an
      // individual password, so larger is better. however, larger also means longer
      // to hash the password. tune so that hashing the password takes about a
      // second
      iterations: iterations ?? StaticHelpersPbkdf2.Pbkdf2IterationsPerSecond, //old given value: 872791,
    };
  }

  /**
   * Given a password, use pbkdf2 to generate an appropriately sized key for AES encryption
   * @param password
   * @param salt
   * @param iterations
   * @returns
   */
  public static deriveKeyFromPassword(
    password: Buffer,
    salt?: Buffer,
    iterations?: number,
  ): IPbkdf2Result {
    const config = StaticHelpersPbkdf2.pbkdf2Config(iterations);
    const saltBytes = salt ?? randomBytes(config.saltBytes);
    if (saltBytes.length !== config.saltBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength);
    }
    const hashBytes = pbkdf2Sync(
      password,
      saltBytes,
      config.iterations,
      config.hashBytes,
      'sha512',
    );
    if (hashBytes.length !== config.hashBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidHashLength);
    }
    return {
      salt: saltBytes,
      hash: hashBytes,
      iterations: config.iterations,
    };
  }
}
