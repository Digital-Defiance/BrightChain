/**
 * Client-side encryption library for E2EE file uploads.
 *
 * Encrypts file content entirely in the browser before the bytes are sent to
 * the server.  The server receives only ciphertext and a client-wrapped key —
 * it never has access to the plaintext or the raw symmetric key.
 *
 * Encryption scheme:
 *   1. A random 256-bit AES-GCM key and 96-bit IV are generated via Web Crypto.
 *   2. The file is encrypted with AES-256-GCM; the 16-byte auth tag is
 *      separated from the ciphertext before upload so the server can store
 *      them independently.
 *   3. The symmetric key is ECIES-wrapped under the user's secp256k1 public
 *      key (derived from their private key) using BlockECIES — the same
 *      library used on the server and for the download path.
 */

import { BlockECIES } from '@brightchain/brightchain-lib';
import { secp256k1 } from '@noble/curves/secp256k1';

/**
 * Encode a Uint8Array as a base64 string (browser-safe).
 */
function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encrypt a file client-side for an E2EE upload.
 *
 * Steps:
 *   1. Derive the user's compressed secp256k1 public key from their private key.
 *   2. Generate a random AES-256-GCM key + 12-byte IV (Web Crypto CSPRNG).
 *   3. Encrypt `fileBytes` with AES-256-GCM — Web Crypto appends the 16-byte
 *      auth tag to the end of the output buffer; we split them apart.
 *   4. ECIES-wrap the symmetric key with the user's public key via BlockECIES.
 *   5. Return the ciphertext, IV, auth tag, and wrapped key as base64 strings
 *      ready to pass to `initUpload`.
 *
 * @param fileBytes     Raw file content to encrypt.
 * @param userPrivateKey  The wallet's 32-byte secp256k1 private key.
 * @returns Encrypted artefacts: ciphertext bytes, and base64-encoded IV,
 *          auth tag, and ECIES-wrapped symmetric key.
 */
export async function encryptFileForUpload(
  fileBytes: Uint8Array,
  userPrivateKey: Uint8Array,
): Promise<{
  ciphertext: Uint8Array;
  ivB64: string;
  authTagB64: string;
  wrappedKeyB64: string;
}> {
  // Derive compressed public key (33 bytes) from the private key
  const userPublicKey = secp256k1.getPublicKey(userPrivateKey, true);

  // Generate a fresh random symmetric key and IV
  const symmetricKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // AES-256-GCM encrypt — output is ciphertext || 16-byte authTag
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    symmetricKey.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    fileBytes as unknown as Uint8Array<ArrayBuffer>,
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  // ECIES-wrap the symmetric key with the user's public key
  const wrappedKey = await BlockECIES.encrypt(userPublicKey, symmetricKey);

  return {
    ciphertext,
    ivB64: bytesToB64(iv),
    authTagB64: bytesToB64(authTag),
    wrappedKeyB64: bytesToB64(wrappedKey),
  };
}
