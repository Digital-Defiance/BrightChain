/**
 * Encrypted block-store profile (see docs/architecture/brightdb-encryption.md
 * and the spec's encryption appendix). The logical v2 digest stays the block's
 * name everywhere in the graph. On disk each block lives under a keyed name and
 * holds AES-256-GCM ciphertext bound to its logical digest.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

export const ENCRYPTION_MARKER = 'BrightDB encryption 1\n';
/** Bytes a sealed block adds to its plaintext: version, nonce and tag. */
export const SEAL_OVERHEAD = 1 + 12 + 16;
const HKDF_SALT = Buffer.from('BrightDB v2 encryption', 'utf8');
const NAME_LABEL = Buffer.from('brightdb-v2-name', 'utf8');
const BLOCK_AAD = Buffer.from('BDB2-block', 'utf8');
const HEAD_AAD = Buffer.from('BDB2-head', 'utf8');

export class BrightDbV2DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrightDbV2DecryptionError';
  }
}

/** What the disk store needs from an encryption profile. */
export interface BrightDbV2BlockCipher {
  /** The on-disk file name (128 lowercase hex digits) for a logical digest. */
  physicalName(logicalDigest: string): string;
  /** Encrypt a block's plaintext for storage. */
  seal(logicalDigest: string, plaintext: Uint8Array): Buffer;
  /** Decrypt a stored block. Throws BrightDbV2DecryptionError on a wrong key or tampering. */
  open(logicalDigest: string, sealed: Uint8Array): Buffer;
  /** Encrypt the published head digest for the HEAD file. */
  sealHead(digest: string): Buffer;
  openHead(sealed: Uint8Array): string;
  /** Size of a sealed HEAD file. */
  readonly sealedHeadBytes: number;
}

/**
 * Keys that survive rotation. Names come from `nameSecret`, which never
 * changes for a database, so blocks keep their names when the data key
 * rotates. Each sealed block records the version of the data key that sealed
 * it; new blocks use `currentVersion` and old ones stay readable for as long as
 * their version is in `dataKeys`. A holder of only old versions can read old
 * blocks but not anything sealed after a rotation.
 */
export interface BrightDbV2KeyRing {
  /** 32 bytes. Must stay the same for the life of the database. */
  nameSecret: Uint8Array;
  /** Data key material by version, each 32 bytes. Versions are 1 to 255. */
  dataKeys: Record<number, Uint8Array>;
  currentVersion: number;
}

/** AES-256-GCM. A single 32-byte master key is shorthand for a ring whose name secret and data key 1 are that key. */
export class BrightDbV2AesCipher implements BrightDbV2BlockCipher {
  private readonly nameKey: Buffer;
  private readonly dataKeys = new Map<number, Buffer>();
  private readonly currentVersion: number;
  readonly sealedHeadBytes = SEAL_OVERHEAD + 64;

  constructor(keys: Uint8Array | BrightDbV2KeyRing) {
    const ring: BrightDbV2KeyRing =
      keys instanceof Uint8Array
        ? { nameSecret: keys, dataKeys: { 1: keys }, currentVersion: 1 }
        : keys;
    const derive = (material: Uint8Array, info: string) => {
      if (material.length !== 32) {
        throw new Error('A BrightDB encryption key must be exactly 32 bytes');
      }
      return Buffer.from(hkdfSync('sha256', material, HKDF_SALT, info, 32));
    };
    this.nameKey = derive(ring.nameSecret, 'name');
    for (const [version, material] of Object.entries(ring.dataKeys)) {
      const number = Number(version);
      if (!Number.isInteger(number) || number < 1 || number > 255) {
        throw new Error('A key version must be an integer from 1 to 255');
      }
      this.dataKeys.set(number, derive(material, 'data'));
    }
    if (!this.dataKeys.has(ring.currentVersion)) {
      throw new Error('The current key version has no data key');
    }
    this.currentVersion = ring.currentVersion;
  }

  physicalName(logicalDigest: string): string {
    return createHmac('sha512', this.nameKey)
      .update(NAME_LABEL)
      .update(Buffer.from(logicalDigest, 'hex'))
      .digest('hex');
  }

  private encrypt(aad: Buffer, plaintext: Uint8Array, nonce: Buffer): Buffer {
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.dataKeys.get(this.currentVersion) as Buffer,
      nonce,
    );
    cipher.setAAD(aad);
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([Buffer.from([this.currentVersion]), nonce, body, cipher.getAuthTag()]);
  }

  private decrypt(aad: Buffer, sealed: Uint8Array): Buffer {
    const bytes = Buffer.from(sealed);
    if (bytes.length < SEAL_OVERHEAD) {
      throw new BrightDbV2DecryptionError('Truncated encrypted block');
    }
    const key = this.dataKeys.get(bytes[0]);
    if (!key) {
      throw new BrightDbV2DecryptionError(`No key for encryption key version ${bytes[0]}`);
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(1, 13));
      decipher.setAAD(aad);
      decipher.setAuthTag(bytes.subarray(bytes.length - 16));
      return Buffer.concat([decipher.update(bytes.subarray(13, bytes.length - 16)), decipher.final()]);
    } catch {
      throw new BrightDbV2DecryptionError('Wrong key, or the block was changed or swapped');
    }
  }

  /** `nonce` is for known-answer tests only; callers should leave it unset. */
  seal(logicalDigest: string, plaintext: Uint8Array, nonce: Buffer = randomBytes(12)): Buffer {
    return this.encrypt(
      Buffer.concat([BLOCK_AAD, Buffer.from(logicalDigest, 'hex')]),
      plaintext,
      nonce,
    );
  }

  open(logicalDigest: string, sealed: Uint8Array): Buffer {
    return this.decrypt(
      Buffer.concat([BLOCK_AAD, Buffer.from(logicalDigest, 'hex')]),
      sealed,
    );
  }

  sealHead(digest: string, nonce: Buffer = randomBytes(12)): Buffer {
    return this.encrypt(HEAD_AAD, Buffer.from(digest, 'hex'), nonce);
  }

  openHead(sealed: Uint8Array): string {
    return this.decrypt(HEAD_AAD, sealed).toString('hex');
  }
}
