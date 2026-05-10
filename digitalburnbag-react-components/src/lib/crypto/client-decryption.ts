/**
 * Client-side decryption library for external share recipients.
 *
 * Handles ephemeral key pair and recipient public key encryption modes
 * where decryption happens entirely in the browser — the server never
 * sees the plaintext symmetric key or file content.
 */

import { BlockECIES } from '@brightchain/brightchain-lib';

/**
 * Extract the ephemeral private key from the URL fragment.
 * The fragment is never sent to the server by the browser.
 */
export function extractEphemeralKeyFromFragment(
  fragment?: string,
): Uint8Array | null {
  const frag = fragment ?? window.location.hash;
  if (!frag || frag.length < 2) return null;

  // Strip leading '#'
  const encoded = frag.startsWith('#') ? frag.slice(1) : frag;
  try {
    const raw = atob(encoded);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Decrypt a wrapped symmetric key using the recipient's private key.
 *
 * This uses the Web Crypto API with ECDH key agreement (P-256) to
 * derive a shared secret, then AES-GCM to unwrap the symmetric key.
 */
export async function unwrapSymmetricKey(
  wrappedKey: Uint8Array,
  recipientPrivateKey: CryptoKey,
  senderPublicKeyRaw: Uint8Array,
): Promise<CryptoKey> {
  // Import the sender's public key
  const senderPublicKey = await crypto.subtle.importKey(
    'raw',
    senderPublicKeyRaw.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // Derive shared secret via ECDH
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: senderPublicKey },
    recipientPrivateKey,
    256,
  );

  // Use derived bits as AES-GCM key for unwrapping
  const unwrapKey = await crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  // The wrapped key format: first 12 bytes = IV, rest = ciphertext
  const iv = wrappedKey.slice(0, 12);
  const ciphertext = wrappedKey.slice(12);

  const decryptedKeyBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    unwrapKey,
    ciphertext,
  );

  // Import the decrypted symmetric key for AES-GCM file decryption
  return crypto.subtle.importKey(
    'raw',
    decryptedKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
}

/**
 * Decrypt file content using the symmetric key (AES-256-GCM).
 *
 * @param encryptedContent - The encrypted file bytes (IV prepended)
 * @param symmetricKey - The AES-GCM CryptoKey
 * @returns Decrypted file content as ArrayBuffer
 */
export async function decryptFileContent(
  encryptedContent: Uint8Array,
  symmetricKey: CryptoKey,
): Promise<ArrayBuffer> {
  // First 12 bytes = IV, rest = ciphertext + auth tag
  const iv = encryptedContent.slice(0, 12);
  const ciphertext = encryptedContent.slice(12);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    ciphertext,
  );
}

/**
 * Import a raw private key (e.g., from URL fragment) as a CryptoKey
 * suitable for ECDH key agreement.
 */
export async function importPrivateKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    rawKey.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
}

/**
 * Full decryption flow for ephemeral key pair mode:
 * 1. Extract ephemeral private key from URL fragment
 * 2. Import it as a CryptoKey
 * 3. Unwrap the symmetric key using ECDH
 * 4. Decrypt the file content
 */
export async function decryptEphemeralShare(
  wrappedSymmetricKey: Uint8Array,
  senderPublicKeyRaw: Uint8Array,
  encryptedContent: Uint8Array,
  fragment?: string,
): Promise<ArrayBuffer> {
  const ephemeralKeyBytes = extractEphemeralKeyFromFragment(fragment);
  if (!ephemeralKeyBytes) {
    throw new Error(
      'Could not extract ephemeral private key from URL fragment',
    );
  }

  const privateKey = await importPrivateKey(ephemeralKeyBytes);
  const symmetricKey = await unwrapSymmetricKey(
    wrappedSymmetricKey,
    privateKey,
    senderPublicKeyRaw,
  );
  return decryptFileContent(encryptedContent, symmetricKey);
}

/**
 * Decode a base64 string to Uint8Array.
 */
function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Full E2EE download for authenticated wallet users.
 *
 * Uses BlockECIES (ECIES + secp256k1) to unwrap the per-file symmetric
 * key, then AES-256-GCM to decrypt the file content — everything happens
 * in the browser and the plaintext never leaves the client.
 *
 * @param encryptedSymmetricKeyB64 - Base64-encoded ECIES-wrapped symmetric key
 * @param encryptedContentB64 - Base64-encoded AES-256-GCM ciphertext
 * @param ivB64 - Base64-encoded 12-byte IV
 * @param authTagB64 - Base64-encoded 16-byte authentication tag
 * @param userPrivateKey - The wallet private key (from wallet.getPrivateKey())
 * @returns Decrypted file bytes
 */
export async function decryptAuthenticatedUserFile(
  encryptedSymmetricKeyB64: string,
  encryptedContentB64: string,
  ivB64: string,
  authTagB64: string,
  userPrivateKey: Uint8Array,
): Promise<Uint8Array> {
  // Unwrap the symmetric key using ECIES
  const encryptedSymmetricKey = b64ToBytes(encryptedSymmetricKeyB64);
  const symmetricKeyBytes = await BlockECIES.decrypt(
    userPrivateKey,
    encryptedSymmetricKey,
  );

  // AES-256-GCM decrypt the file content (Web Crypto, same as server-side)
  const encryptedContent = b64ToBytes(encryptedContentB64);
  const iv = b64ToBytes(ivB64);
  const authTag = b64ToBytes(authTagB64);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    symmetricKeyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  // Web Crypto expects ciphertext + authTag concatenated
  const combined = new Uint8Array(encryptedContent.length + authTag.length);
  combined.set(encryptedContent, 0);
  combined.set(authTag, encryptedContent.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, tagLength: 128 },
    cryptoKey,
    combined.buffer as ArrayBuffer,
  );

  return new Uint8Array(decrypted);
}
