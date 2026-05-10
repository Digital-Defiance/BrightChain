/**
 * @fileoverview PEM encoding/decoding for compressed secp256k1 public keys.
 *
 * Wraps a 33-byte compressed secp256k1 public key in a DER-encoded
 * SubjectPublicKeyInfo structure, then base64-encodes with PEM armor.
 *
 * The DER prefix for a compressed secp256k1 SubjectPublicKeyInfo is fixed
 * at 23 bytes, giving a total DER structure of 56 bytes (23 + 33).
 *
 * Requirement 3.2 — PEM-encoded compressed secp256k1 public key
 * Requirement 8.1 — DER SubjectPublicKeyInfo with PEM armor
 * Requirement 8.2 — base64 with 64-char line wrapping (RFC 7468)
 * Requirement 8.3 — parseable by standard libraries (e.g. OpenSSL)
 */

// ---------------------------------------------------------------------------
// DER prefix for compressed secp256k1 SubjectPublicKeyInfo
// ---------------------------------------------------------------------------

/**
 * Fixed 23-byte DER prefix for a compressed secp256k1 SubjectPublicKeyInfo:
 *
 * ```
 * 30 36                          -- SEQUENCE (54 bytes)
 *   30 10                        -- SEQUENCE (16 bytes)
 *     06 07 2a 86 48 ce 3d 02 01  -- OID 1.2.840.10045.2.1 (EC)
 *     06 05 2b 81 04 00 0a        -- OID 1.3.132.0.10 (secp256k1)
 *   03 22 00                     -- BIT STRING (34 bytes, 0 unused bits)
 * ```
 *
 * Note: The design doc originally stated 26 bytes / 59 total, but the correct
 * DER encoding for a 33-byte compressed key yields 23-byte prefix / 56 total.
 * Verified against Node.js `crypto.createPublicKey()` and OpenSSL.
 */
const SECP256K1_SPKI_DER_PREFIX = new Uint8Array([
  0x30, 0x36, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a, 0x03, 0x22, 0x00,
]);

/** Expected total DER length: 23-byte prefix + 33-byte compressed key. */
const EXPECTED_DER_LENGTH = SECP256K1_SPKI_DER_PREFIX.length + 33;

/** Compressed secp256k1 public key length. */
const COMPRESSED_KEY_LENGTH = 33;

const PEM_HEADER = '-----BEGIN PUBLIC KEY-----';
const PEM_FOOTER = '-----END PUBLIC KEY-----';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a 33-byte compressed secp256k1 public key to PEM format.
 *
 * Concatenates the fixed 23-byte DER prefix with the compressed key,
 * base64-encodes, wraps at 64 characters, and adds PEM armor.
 *
 * @param compressedKey - 33-byte compressed secp256k1 public key (0x02 or 0x03 prefix)
 * @returns PEM-encoded SubjectPublicKeyInfo string
 * @throws {Error} if the key is not 33 bytes or has an invalid prefix byte
 */
export function compressedKeyToPem(compressedKey: Uint8Array): string {
  if (compressedKey.length !== COMPRESSED_KEY_LENGTH) {
    throw new Error(
      `Invalid compressed key length: expected ${COMPRESSED_KEY_LENGTH}, got ${compressedKey.length}`,
    );
  }

  if (compressedKey[0] !== 0x02 && compressedKey[0] !== 0x03) {
    throw new Error(
      `Invalid compressed key prefix byte: expected 0x02 or 0x03, got 0x${compressedKey[0].toString(16).padStart(2, '0')}`,
    );
  }

  // Concatenate DER prefix + compressed key
  const der = new Uint8Array(EXPECTED_DER_LENGTH);
  der.set(SECP256K1_SPKI_DER_PREFIX, 0);
  der.set(compressedKey, SECP256K1_SPKI_DER_PREFIX.length);

  // Base64-encode and wrap at 64 characters
  const b64 = Buffer.from(der).toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.slice(i, i + 64));
  }

  return `${PEM_HEADER}\n${lines.join('\n')}\n${PEM_FOOTER}\n`;
}

/**
 * Parses a PEM-encoded secp256k1 public key back to the 33-byte compressed form.
 *
 * Strips PEM armor, base64-decodes, verifies the 56-byte DER length and
 * secp256k1 OID prefix, then extracts the last 33 bytes.
 *
 * @param pem - PEM-encoded SubjectPublicKeyInfo string
 * @returns 33-byte compressed key, or `undefined` if the PEM is malformed
 *          or the key is not secp256k1
 */
export function pemToCompressedKey(pem: string): Uint8Array | undefined {
  // Strip PEM armor lines and whitespace
  const lines = pem
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith('-----BEGIN') &&
        !l.startsWith('-----END'),
    );

  const b64 = lines.join('');
  if (b64.length === 0) {
    return undefined;
  }

  let der: Buffer;
  try {
    der = Buffer.from(b64, 'base64');
  } catch {
    return undefined;
  }

  // Verify expected DER length
  if (der.length !== EXPECTED_DER_LENGTH) {
    return undefined;
  }

  // Verify the DER prefix matches the secp256k1 SPKI prefix
  for (let i = 0; i < SECP256K1_SPKI_DER_PREFIX.length; i++) {
    if (der[i] !== SECP256K1_SPKI_DER_PREFIX[i]) {
      return undefined;
    }
  }

  // Extract the last 33 bytes (the compressed key)
  return new Uint8Array(der.slice(SECP256K1_SPKI_DER_PREFIX.length));
}
