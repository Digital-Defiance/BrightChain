/**
 * Cross-platform crypto utilities that work in both Node.js and browser environments.
 *
 * Uses the Web Crypto API (globalThis.crypto) which is available in:
 * - All modern browsers
 * - Node.js 16+ (via globalThis.crypto / webcrypto)
 *
 * This avoids importing from 'crypto' which gets externalized by Vite
 * when bundling for the browser.
 */

/**
 * Convert a Uint8Array to a plain ArrayBuffer suitable for Web Crypto API.
 * This avoids TS strict errors where Uint8Array<ArrayBufferLike> is not
 * assignable to BufferSource (which requires ArrayBuffer, not SharedArrayBuffer).
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

/**
 * Generate cryptographically secure random bytes.
 * Uses globalThis.crypto.getRandomValues (works in both Node and browser).
 */
export function crossPlatformRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Compute SHA-256 hash of the given data.
 * Uses Web Crypto API (async).
 */
export async function crossPlatformSha256(
  data: Uint8Array,
): Promise<Uint8Array> {
  const hashBuffer = await globalThis.crypto.subtle.digest(
    'SHA-256',
    toArrayBuffer(data),
  );
  return new Uint8Array(hashBuffer);
}

/**
 * Encrypt data using AES-256-GCM.
 * Returns { ciphertext, authTag }.
 */
export async function aes256GcmEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  iv: Uint8Array,
): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  // Web Crypto API appends the 16-byte auth tag to the ciphertext
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), tagLength: 128 },
    cryptoKey,
    toArrayBuffer(plaintext),
  );

  const encryptedBytes = new Uint8Array(encrypted);
  // Last 16 bytes are the auth tag
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);

  return { ciphertext, authTag };
}

/**
 * Decrypt data using AES-256-GCM.
 */
export async function aes256GcmDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  authTag: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  // Web Crypto API expects ciphertext + authTag concatenated
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), tagLength: 128 },
    cryptoKey,
    toArrayBuffer(combined),
  );

  return new Uint8Array(decrypted);
}
