/**
 * The BrightDB v2 encrypted block-store profile (spec section 10) on WebCrypto,
 * for browsers. It produces the same bytes as the Node and C++ implementations:
 * keyed names are HMAC-SHA512 under an HKDF-SHA256 name key, and blocks are
 * AES-256-GCM sealed (version byte, 12-byte nonce, ciphertext, 16-byte tag)
 * with the logical digest bound in as associated data. WebCrypto is
 * asynchronous, so this is a separate class from the synchronous Node cipher.
 * Platform neutral: only `globalThis.crypto.subtle` is used.
 */
import type { BrightDbV2KeyRing } from './encryption';
import { BrightDbV2StorageError } from './storage';

const SEAL_OVERHEAD = 1 + 12 + 16;
const HKDF_SALT = new TextEncoder().encode('BrightDB v2 encryption');
const NAME_LABEL = new TextEncoder().encode('brightdb-v2-name');
const BLOCK_AAD = new TextEncoder().encode('BDB2-block');
const HEAD_AAD = new TextEncoder().encode('BDB2-head');
export const WEB_ENCRYPTION_MARKER = 'BrightDB encryption 1\n';

const bytes = (data: Uint8Array): BufferSource => data as unknown as BufferSource;
const hex = (data: Uint8Array): string => Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (text: string): Uint8Array => Uint8Array.from(text.match(/../gu) ?? [], (h) => parseInt(h, 16));
const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

export class BrightDbV2WebCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrightDbV2WebCipherError';
  }
}

export class BrightDbV2WebCipher {
  readonly sealedHeadBytes = SEAL_OVERHEAD + 64;

  private constructor(
    private readonly nameKey: CryptoKey,
    private readonly dataKeys: Map<number, CryptoKey>,
    readonly currentKeyVersion: number,
  ) {}

  /** A 32-byte master key, or a key ring (stable name secret, versioned data keys). */
  static async create(keys: Uint8Array | BrightDbV2KeyRing): Promise<BrightDbV2WebCipher> {
    const subtle = globalThis.crypto.subtle;
    const ring: BrightDbV2KeyRing =
      keys instanceof Uint8Array ? { nameSecret: keys, dataKeys: { 1: keys }, currentVersion: 1 } : keys;
    const derive = async (material: Uint8Array, info: string): Promise<Uint8Array> => {
      if (material.length !== 32) throw new Error('A BrightDB encryption key must be exactly 32 bytes');
      const base = await subtle.importKey('raw', bytes(material), 'HKDF', false, ['deriveBits']);
      return new Uint8Array(
        await subtle.deriveBits(
          { name: 'HKDF', hash: 'SHA-256', salt: bytes(HKDF_SALT), info: bytes(new TextEncoder().encode(info)) },
          base,
          256,
        ),
      );
    };
    const nameKey = await subtle.importKey('raw', bytes(await derive(ring.nameSecret, 'name')), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const dataKeys = new Map<number, CryptoKey>();
    for (const [version, material] of Object.entries(ring.dataKeys)) {
      const number = Number(version);
      if (!Number.isInteger(number) || number < 1 || number > 255) {
        throw new Error('A key version must be an integer from 1 to 255');
      }
      dataKeys.set(number, await subtle.importKey('raw', bytes(await derive(material, 'data')), 'AES-GCM', false, ['encrypt', 'decrypt']));
    }
    if (!dataKeys.has(ring.currentVersion)) throw new Error('The current key version has no data key');
    return new BrightDbV2WebCipher(nameKey, dataKeys, ring.currentVersion);
  }

  /** The stored name (128 lowercase hex digits) for a logical digest. */
  async physicalName(logicalDigest: string): Promise<string> {
    const mac = await globalThis.crypto.subtle.sign('HMAC', this.nameKey, bytes(concat(NAME_LABEL, unhex(logicalDigest))));
    return hex(new Uint8Array(mac));
  }

  private async encrypt(aad: Uint8Array, plaintext: Uint8Array, nonce: Uint8Array): Promise<Uint8Array> {
    const key = this.dataKeys.get(this.currentKeyVersion) as CryptoKey;
    const body = new Uint8Array(
      await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv: bytes(nonce), additionalData: bytes(aad), tagLength: 128 }, key, bytes(plaintext)),
    );
    return concat(Uint8Array.of(this.currentKeyVersion), nonce, body); // body already ends with the 16-byte tag
  }

  private async decrypt(aad: Uint8Array, sealed: Uint8Array): Promise<Uint8Array> {
    if (sealed.length < SEAL_OVERHEAD) throw new BrightDbV2WebCipherError('Truncated encrypted block');
    const key = this.dataKeys.get(sealed[0]);
    if (!key) throw new BrightDbV2WebCipherError(`No key for encryption key version ${sealed[0]}`);
    try {
      return new Uint8Array(
        await globalThis.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: bytes(sealed.subarray(1, 13)), additionalData: bytes(aad), tagLength: 128 },
          key,
          bytes(sealed.subarray(13)),
        ),
      );
    } catch {
      throw new BrightDbV2WebCipherError('Wrong key, or the block was changed or swapped');
    }
  }

  /** `nonce` is for known-answer tests only; callers should leave it unset. */
  seal(logicalDigest: string, plaintext: Uint8Array, nonce: Uint8Array = globalThis.crypto.getRandomValues(new Uint8Array(12))): Promise<Uint8Array> {
    return this.encrypt(concat(BLOCK_AAD, unhex(logicalDigest)), plaintext, nonce);
  }

  open(logicalDigest: string, sealed: Uint8Array): Promise<Uint8Array> {
    return this.decrypt(concat(BLOCK_AAD, unhex(logicalDigest)), sealed);
  }

  sealHead(digest: string, nonce: Uint8Array = globalThis.crypto.getRandomValues(new Uint8Array(12))): Promise<Uint8Array> {
    return this.encrypt(HEAD_AAD, unhex(digest), nonce);
  }

  async openHead(sealed: Uint8Array): Promise<string> {
    return hex(await this.decrypt(HEAD_AAD, sealed));
  }
}

export function wrapDecryptionError(error: unknown, what: string): never {
  if (error instanceof BrightDbV2WebCipherError) {
    throw new BrightDbV2StorageError(`${what}: ${error.message}`, { cause: error });
  }
  throw error;
}
