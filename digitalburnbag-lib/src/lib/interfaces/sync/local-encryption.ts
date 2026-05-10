import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Encrypts and decrypts locally cached files at rest using the user's ECIES-derived key.
 */
export interface ILocalEncryption<TID extends PlatformID> {
  /** Initialize encryption with the user's key material */
  initialize(userId: TID, keyMaterial: Uint8Array): Promise<void>;

  /** Encrypt a file at the given local path (in-place) */
  encryptFile(localPath: string): Promise<void>;

  /** Decrypt a file at the given local path (in-place) */
  decryptFile(localPath: string): Promise<void>;

  /** Encrypt raw bytes and return ciphertext */
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;

  /** Decrypt raw ciphertext and return plaintext */
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;

  /** Securely wipe the key material from memory */
  destroy(): void;
}
