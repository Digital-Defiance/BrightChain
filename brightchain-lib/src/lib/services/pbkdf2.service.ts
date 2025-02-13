import { pbkdf2Sync, randomBytes } from 'crypto';
import { ECIES, PBKDF2 } from '../constants';
import { Pbkdf2ErrorType } from '../enumerations/pbkdf2ErrorType';
import { Pbkdf2Error } from '../errors/pbkdf2Error';
import { IPbkf2Config } from '../interfaces/pbkdf2Config';
import { IPbkdf2Result } from '../interfaces/pbkdf2Result';

/**
 * Service for handling PBKDF2 (Password-Based Key Derivation Function 2) operations.
 * This service provides functionality for:
 * - Generating secure key derivation configurations
 * - Deriving cryptographic keys from passwords
 * - Managing salt and iteration parameters
 */
export class Pbkdf2Service {
  /**
   * Generate an options object for pbkdf2
   * @param iterations Optional number of iterations (defaults to Pbkdf2IterationsPerSecond)
   * @returns Configuration object for PBKDF2
   */
  public static getConfig(iterations?: number): IPbkf2Config {
    // larger numbers mean better security, less
    return {
      // size of the generated hash
      hashBytes: ECIES.SYMMETRIC.KEY_LENGTH,
      // larger salt means hashed passwords are more resistant to rainbow table, but
      // you get diminishing returns pretty fast
      saltBytes: PBKDF2.SALT_BYTES,
      // more iterations means an attacker has to take longer to brute force an
      // individual password, so larger is better. however, larger also means longer
      // to hash the password. tune so that hashing the password takes about a
      // second
      iterations: iterations ?? PBKDF2.ITERATIONS_PER_SECOND,
    };
  }

  /**
   * Given a password, use pbkdf2 to generate an appropriately sized key for AES encryption
   * @param password The password to derive a key from
   * @param salt Optional salt (will be randomly generated if not provided)
   * @param iterations Optional number of iterations
   * @returns Object containing the derived key, salt, and iteration count
   */
  public static deriveKeyFromPassword(
    password: Buffer,
    salt?: Buffer,
    iterations?: number,
  ): IPbkdf2Result {
    const config = Pbkdf2Service.getConfig(iterations);
    const saltBytes = salt ?? randomBytes(config.saltBytes);

    if (saltBytes.length !== config.saltBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength);
    }

    const hashBytes = pbkdf2Sync(
      password,
      saltBytes,
      config.iterations,
      config.hashBytes,
      PBKDF2.ALGORITHM,
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
