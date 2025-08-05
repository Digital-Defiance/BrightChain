export interface IPBkdf2Consts {
  /** Hash algorithm (sha512) */
  ALGORITHM: string;

  /** Number of bytes in a salt. */
  SALT_BYTES: number;

  /** Expected number of pbkdf2 iterations per second when hashing a password. */
  ITERATIONS_PER_SECOND: number;
}
