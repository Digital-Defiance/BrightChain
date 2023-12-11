import { ISimpleKeyPair } from '@digitaldefiance/ecies-lib';
import { ec } from 'elliptic';

/**
 * Combined data and signing key pairs
 *
 * @remarks
 * This interface holds both the signing key pair (for authentication and
 * signatures) and the data key pair (for encryption/decryption). These
 * are typically used together for secure operations.
 *
 * @example
 * ```typescript
 * const keys: IDataAndSigningKeys = {
 *   signing: signingKeyPair,
 *   data: dataKeyPair
 * };
 * ```
 */
export interface IDataAndSigningKeys {
  /** Elliptic curve key pair used for signing operations */
  signing: ec.KeyPair;

  /** Simple key pair used for data encryption/decryption */
  data: ISimpleKeyPair;
}
