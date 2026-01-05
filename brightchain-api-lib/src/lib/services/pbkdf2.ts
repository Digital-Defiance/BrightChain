import { pbkdf2, pbkdf2Sync } from 'crypto';
import { IPbkdf2Result } from '../interfaces/pbkdf2-result';

export class Pbkdf2Service {
  public static deriveKeyFromPassword(
    password: Buffer,
    salt: Buffer,
    iterations: number,
    saltSize: number,
    keyLength: number,
    digest: string,
  ): IPbkdf2Result {
    const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest);
    return {
      hash,
      salt,
      iterations,
      // digest,
    };
  }

  public static async deriveKeyFromPasswordAsync(
    password: Buffer,
    salt: Buffer,
    iterations: number,
    saltSize: number,
    keyLength: number,
    digest: string,
  ): Promise<IPbkdf2Result> {
    return new Promise((resolve, reject) => {
      pbkdf2(password, salt, iterations, keyLength, digest, (err, hash) => {
        if (err) return reject(err);
        resolve({
          hash,
          salt,
          iterations,
          // digest,
        });
      });
    });
  }
}
