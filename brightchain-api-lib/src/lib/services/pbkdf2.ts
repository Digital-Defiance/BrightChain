import {
  ECIES,
  IPbkdf2Config,
  Pbkdf2Error,
  Pbkdf2ErrorType,
} from '@brightchain/brightchain-lib';
import { pbkdf2 as pbkdf2Async, pbkdf2Sync, randomBytes } from 'crypto';
import { promisify } from 'util';
import { PBKDF2, PBKDF2_PROFILES } from '../constants';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';
import { IPbkdf2Result } from '../interfaces/pbkdf2-result';

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
  public static getProfileConfig(profile: Pbkdf2ProfileEnum): IPbkdf2Config {
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
      hashBytes: hashBytes ?? ECIES.SYMMETRIC.KEY_SIZE,
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
  public static deriveKeyFromPassword(
    password: Buffer,
    salt?: Buffer,
    iterations?: number,
    saltBytes?: number,
    keySize?: number,
    algorithm?: string,
  ): IPbkdf2Result {
    const config = Pbkdf2Service.getConfig(
      iterations,
      saltBytes,
      keySize,
      algorithm,
    );
    const saltBytes_ = salt ?? randomBytes(config.saltBytes);

    if (saltBytes_.length !== config.saltBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength);
    }

    const hashBytes = pbkdf2Sync(
      password,
      saltBytes_,
      config.iterations,
      config.hashBytes,
      config.algorithm,
    );

    if (hashBytes.length !== config.hashBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidHashLength);
    }

    return {
      salt: saltBytes_,
      hash: hashBytes,
      iterations: config.iterations,
    };
  }

  /**
   * Async version of deriveKeyFromPassword that uses libuv threadpool via crypto.pbkdf2
   * to avoid blocking the event loop during password verification.
   * @param password The password to derive a key from
   * @param salt Optional salt (will be randomly generated if not provided)
   * @param iterations Optional number of iterations
   * @param saltBytes Optional salt size in bytes
   * @param keySize Optional key size in bytes
   * @param algorithm Optional hash algorithm
   * @returns Promise resolving to object containing the derived key, salt, and iteration count
   */
  public static async deriveKeyFromPasswordAsync(
    password: Buffer,
    salt?: Buffer,
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
    const saltBytes_ = salt ?? randomBytes(config.saltBytes);

    if (saltBytes_.length !== config.saltBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength);
    }

    const pbkdf2 = promisify(pbkdf2Async);
    const hashBytes = (await pbkdf2(
      password,
      saltBytes_,
      config.iterations,
      config.hashBytes,
      config.algorithm,
    )) as Buffer;

    if (hashBytes.length !== config.hashBytes) {
      throw new Pbkdf2Error(Pbkdf2ErrorType.InvalidHashLength);
    }

    return {
      salt: saltBytes_,
      hash: hashBytes,
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
  public static deriveKeyFromPasswordWithProfile(
    password: Buffer,
    profile: Pbkdf2ProfileEnum,
    salt?: Buffer,
  ): IPbkdf2Result {
    const config = Pbkdf2Service.getProfileConfig(profile);
    return Pbkdf2Service.deriveKeyFromPassword(
      password,
      salt,
      config.iterations,
      config.saltBytes,
      config.hashBytes,
      config.algorithm,
    );
  }

  /**
   * Async version of deriveKeyFromPasswordWithProfile
   * @param password The password to derive a key from
   * @param profile The configuration profile to use
   * @param salt Optional salt (will be randomly generated if not provided)
   * @returns Promise resolving to object containing the derived key, salt, and iteration count
   */
  public static async deriveKeyFromPasswordWithProfileAsync(
    password: Buffer,
    profile: Pbkdf2ProfileEnum,
    salt?: Buffer,
  ): Promise<IPbkdf2Result> {
    const config = Pbkdf2Service.getProfileConfig(profile);
    return Pbkdf2Service.deriveKeyFromPasswordAsync(
      password,
      salt,
      config.iterations,
      config.saltBytes,
      config.hashBytes,
      config.algorithm,
    );
  }
}
