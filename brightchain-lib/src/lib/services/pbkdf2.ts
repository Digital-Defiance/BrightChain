import { ECIES, PBKDF2, PBKDF2_PROFILES } from '../constants';
import { Pbkdf2ErrorType } from '../enumerations/pbkdf2ErrorType';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2Profile';
import { Pbkdf2Error } from '../errors/pbkdf2';
import { IPbkdf2Config } from '../interfaces/pbkdf2Config';
import { IPbkdf2Result } from '../interfaces/pbkdf2Result';

/**
 * Service for handling PBKDF2 (Password-Based Key Derivation Function 2) operations.
 * This service provides functionality for:
 * - Generating secure key derivation configurations
 * - Deriving cryptographic keys from passwords
 * - Managing salt and iteration parameters
 * - Both synchronous and asynchronous key derivation
 */
export abstract class Pbkdf2Service {
  /**
   * Get a predefined configuration profile for common use cases
   * @param profile The name of the profile to use
   * @returns Configuration object for the specified profile
   */
  public static getProfileConfig(
    profile: keyof typeof PBKDF2_PROFILES,
  ): IPbkdf2Config {
    const profileConfig = PBKDF2_PROFILES[profile];
    return {
      hashBytes: profileConfig.hashBytes,
      saltBytes: profileConfig.saltBytes,
      iterations: profileConfig.iterations,
      algorithm: profileConfig.algorithm,
    };
  }

  /**
   * Generate an options object for pbkdf2
   * @param iterations Optional number of iterations (defaults to Pbkdf2IterationsPerSecond)
   * @param saltBytes Optional salt size in bytes (defaults to PBKDF2.SALT_BYTES)
   * @param hashBytes Optional hash size in bytes (defaults to ECIES.SYMMETRIC.KEY_SIZE)
   * @param algorithm Optional hash algorithm (defaults to PBKDF2.ALGORITHM)
   * @returns Configuration object for PBKDF2
   */
  public static getConfig(
    iterations?: number,
    saltBytes?: number,
    hashBytes?: number,
    algorithm?: string,
  ): IPbkdf2Config {
    // larger numbers mean better security, less
    return {
      // size of the generated hash
      hashBytes: hashBytes ?? ECIES.SYMMETRIC.KEY_LENGTH,
      // larger salt means hashed passwords are more resistant to rainbow table, but
      // you get diminishing returns pretty fast
      saltBytes: saltBytes ?? PBKDF2.SALT_BYTES,
      // more iterations means an attacker has to take longer to brute force an
      // individual password, so larger is better. however, larger also means longer
      // to hash the password. tune so that hashing the password takes about a
      // second
      iterations: iterations ?? PBKDF2.ITERATIONS_PER_SECOND,
      // hash algorithm
      algorithm: algorithm ?? PBKDF2.ALGORITHM,
    };
  }

  /**
   * Given a password, use pbkdf2 to generate an appropriately sized key for AES encryption
   * @param password The password to derive a key from
   * @param salt Optional salt (will be randomly generated if not provided)
   * @param iterations Optional number of iterations
   * @param saltBytes Optional salt size in bytes
   * @param keySize Optional key size in bytes
   * @param algorithm Optional hash algorithm
   * @returns Object containing the derived key, salt, and iteration count
   */
  public static async deriveKeyFromPasswordAsync(
    password: Uint8Array,
    salt?: Uint8Array,
    iterations?: number,
    saltBytes?: number,
    keySize?: number,
    algorithm?: string,
  ): Promise<IPbkdf2Result> {
    const config = Pbkdf2Service.getConfig(
      iterations,
      saltBytes,
      keySize,
      algorithm,
    );
    const saltBytes_ =
      salt ?? crypto.getRandomValues(new Uint8Array(config.saltBytes));

    if (saltBytes_.length !== config.saltBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength);
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const keyBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(saltBytes_),
        iterations: config.iterations,
        hash: config.algorithm,
      },
      keyMaterial,
      config.hashBytes * 8,
    );

    const keyBytes = new Uint8Array(keyBuffer);

    if (keyBytes.length !== config.hashBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidHashLength);
    }

    return {
      salt: saltBytes_,
      hash: keyBytes,
      iterations: config.iterations,
    };
  }

  /**
   * Derive a key using a predefined configuration profile
   * @param password The password to derive a key from
   * @param profile The configuration profile to use
   * @param salt Optional salt (will be randomly generated if not provided)
   * @returns Object containing the derived key, salt, and iteration count
   */
  public static async deriveKeyFromPasswordWithProfileAsync(
    password: Uint8Array,
    profile: Pbkdf2ProfileEnum,
    salt?: Uint8Array,
  ): Promise<IPbkdf2Result> {
    const config = Pbkdf2Service.getProfileConfig(profile);
    return await Pbkdf2Service.deriveKeyFromPasswordAsync(
      password,
      salt,
      config.iterations,
      config.saltBytes,
      config.hashBytes,
      config.algorithm,
    );
  }
}
