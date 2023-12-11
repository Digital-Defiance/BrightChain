/**
 * Password-wrapped ECIES private key structure.
 * Mirrors the Mongoose user document's passwordWrappedPrivateKey field.
 */
export interface IPasswordWrappedPrivateKey {
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  iterations: number;
}
