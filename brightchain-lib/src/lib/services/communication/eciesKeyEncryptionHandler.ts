/**
 * @fileoverview ECIES Key Encryption Handler Factory
 *
 * Provides async key encryption/decryption handler types and a factory
 * function that creates ECIES-backed key encryption handlers. These replace
 * the placeholder base64 encoding used by ChannelService and GroupService.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.5, 12.1, 12.2
 */

import { MissingPublicKeyError } from '../../errors/encryptionErrors';

/**
 * Async key encryption handler type — replaces the sync placeholder.
 * Returns encrypted key as Uint8Array (not string) for proper binary handling.
 */
export type AsyncKeyEncryptionHandler = (
  memberId: string,
  symmetricKey: Uint8Array,
) => Promise<Uint8Array>;

/**
 * Async key decryption handler type — unwraps a wrapped key using a member's private key.
 */
export type AsyncKeyDecryptionHandler = (
  memberId: string,
  wrappedKey: Uint8Array,
) => Promise<Uint8Array>;

/**
 * Dependencies for creating the ECIES key encryption handler.
 */
export interface IEciesHandlerDeps {
  eciesService: {
    encryptBasic: (
      publicKey: Uint8Array,
      plaintext: Uint8Array,
    ) => Promise<Uint8Array>;
  };
  getMemberPublicKey: (
    memberId: string,
  ) => Promise<Uint8Array | null | undefined>;
}

/**
 * Creates an async ECIES-backed key encryption handler.
 * Looks up the member's public key, then encrypts the symmetric key under it.
 *
 * @throws {MissingPublicKeyError} when getMemberPublicKey returns null/undefined
 * @see Requirements 8.1, 8.2, 8.3, 8.5, 12.1, 12.2
 */
export function createEciesKeyEncryptionHandler(
  deps: IEciesHandlerDeps,
): AsyncKeyEncryptionHandler {
  return async (
    memberId: string,
    symmetricKey: Uint8Array,
  ): Promise<Uint8Array> => {
    const publicKey = await deps.getMemberPublicKey(memberId);
    if (publicKey == null) {
      throw new MissingPublicKeyError(memberId);
    }
    return deps.eciesService.encryptBasic(publicKey, symmetricKey);
  };
}
