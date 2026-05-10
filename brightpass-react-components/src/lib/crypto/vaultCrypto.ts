/**
 * Client-side AES-256-GCM vault entry encryption/decryption for BrightPass.
 *
 * Key derivation uses VaultKeyDerivation from brightchain-lib, which uses
 * @noble/hashes HKDF-SHA256 — exactly the same algorithm as the server-side
 * VaultEncryption service, ensuring encrypt/decrypt interoperability.
 *
 * The wire format for `encryptedData` is:
 *   base64( [IV(12 bytes)] [AuthTag(16 bytes)] [Ciphertext] )
 *
 * This matches the server's VaultEncryption format so that entries encrypted
 * client-side can be verified/migrated server-side if ever needed.
 */

import type {
  CreditCardEntry,
  IEncryptedVaultEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '@brightchain/brightchain-lib';
import { VaultKeyDerivation } from '@brightchain/brightchain-lib';

const IV_BYTES = 12;
const TAG_BYTES = 16;

// ─── Key derivation ──────────────────────────────────────────────────────────

/**
 * Derive the AES-256-GCM vault key from the vault seed, master password, and
 * vault ID. Uses the same HKDF-SHA256 algorithm as the server-side
 * VaultKeyDerivation service, so keys are identical on both sides.
 *
 * @param vaultSeedBase64 - Base64-encoded 64-byte BIP39 vault seed from server.
 * @param masterPassword  - User's master password (never sent to server after this).
 * @param vaultId         - Vault UUID used as HKDF info.
 * @returns 32-byte raw AES key.
 */
export function deriveVaultKeyFromBase64(
  vaultSeedBase64: string,
  masterPassword: string,
  vaultId: string,
): Uint8Array {
  const vaultSeed = Uint8Array.from(atob(vaultSeedBase64), (c) =>
    c.charCodeAt(0),
  );
  return VaultKeyDerivation.deriveVaultKey(vaultSeed, masterPassword, vaultId);
}

// ─── WebCrypto helpers ───────────────────────────────────────────────────────

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawKey as unknown as Uint8Array<ArrayBuffer>,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Sensitive field extraction ──────────────────────────────────────────────

/**
 * Returns only the fields that must be encrypted for a given entry type.
 * Non-sensitive index fields (title, tags, favorite, siteUrl) stay plaintext
 * in IEncryptedVaultEntry.
 */
function extractSensitiveFields(entry: VaultEntry): Record<string, unknown> {
  const notes: string | undefined = entry.notes;
  switch (entry.type) {
    case 'login': {
      const login = entry as LoginEntry;
      return {
        notes,
        username: login.username,
        password: login.password,
        totpSecret: login.totpSecret,
      };
    }
    case 'secure_note': {
      const note = entry as SecureNoteEntry;
      return { notes, content: note.content };
    }
    case 'credit_card': {
      const card = entry as CreditCardEntry;
      return {
        notes,
        cardholderName: card.cardholderName,
        cardNumber: card.cardNumber,
        expirationDate: card.expirationDate,
        cvv: card.cvv,
      };
    }
    case 'identity': {
      const id = entry as IdentityEntry;
      return {
        notes,
        firstName: id.firstName,
        lastName: id.lastName,
        email: id.email,
        phone: id.phone,
        address: id.address,
      };
    }
  }
}

// ─── Encrypt ─────────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext VaultEntry client-side, producing an IEncryptedVaultEntry
 * suitable for transmission to the server. The server stores the opaque
 * encryptedData blob without decrypting it.
 */
export async function encryptVaultEntry(
  entry: VaultEntry,
  rawKey: Uint8Array,
): Promise<IEncryptedVaultEntry> {
  const cryptoKey = await importAesKey(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(
    JSON.stringify(extractSensitiveFields(entry)),
  );

  // WebCrypto AES-GCM returns: ciphertext || authTag (tag at end)
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    plaintext,
  );
  const encBytes = new Uint8Array(encryptedBuffer);
  const ciphertextLen = encBytes.length - TAG_BYTES;
  const ciphertext = encBytes.slice(0, ciphertextLen);
  const authTag = encBytes.slice(ciphertextLen);

  // Pack as [IV(12)][AuthTag(16)][Ciphertext] — matches VaultEncryption server format
  const packed = new Uint8Array(IV_BYTES + TAG_BYTES + ciphertext.length);
  packed.set(iv, 0);
  packed.set(authTag, IV_BYTES);
  packed.set(ciphertext, IV_BYTES + TAG_BYTES);

  const encryptedData = btoa(String.fromCharCode(...packed));

  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    tags: entry.tags ?? [],
    favorite: entry.favorite,
    siteUrl: entry.type === 'login' ? (entry as LoginEntry).siteUrl : undefined,
    encryptedData,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    attachments: entry.attachments,
  };
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────

/**
 * Decrypt an IEncryptedVaultEntry received from the server, producing the
 * original plaintext VaultEntry. Throws if the key is wrong or the data is
 * tampered.
 */
export async function decryptVaultEntry(
  encrypted: IEncryptedVaultEntry,
  rawKey: Uint8Array,
): Promise<VaultEntry> {
  const cryptoKey = await importAesKey(rawKey);

  // Unpack [IV(12)][AuthTag(16)][Ciphertext]
  const packed = Uint8Array.from(atob(encrypted.encryptedData), (c) =>
    c.charCodeAt(0),
  );
  const iv = packed.slice(0, IV_BYTES);
  const authTag = packed.slice(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = packed.slice(IV_BYTES + TAG_BYTES);

  // WebCrypto AES-GCM expects: ciphertext || authTag (tag appended)
  const cipherWithTag = new Uint8Array(ciphertext.length + TAG_BYTES);
  cipherWithTag.set(ciphertext, 0);
  cipherWithTag.set(authTag, ciphertext.length);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    cipherWithTag,
  );

  const sensitive = JSON.parse(
    new TextDecoder().decode(decryptedBuffer),
  ) as Record<string, unknown>;

  const createdAt =
    typeof encrypted.createdAt === 'string'
      ? new Date(encrypted.createdAt)
      : encrypted.createdAt;
  const updatedAt =
    typeof encrypted.updatedAt === 'string'
      ? new Date(encrypted.updatedAt)
      : encrypted.updatedAt;

  const base = {
    id: encrypted.id,
    title: encrypted.title,
    tags: encrypted.tags,
    favorite: encrypted.favorite,
    notes: sensitive['notes'] as string | undefined,
    createdAt,
    updatedAt,
    attachments: encrypted.attachments,
  };

  switch (encrypted.type) {
    case 'login':
      return {
        ...base,
        type: 'login',
        siteUrl: encrypted.siteUrl ?? '',
        username: sensitive['username'] as string,
        password: sensitive['password'] as string,
        totpSecret: sensitive['totpSecret'] as string | undefined,
      };
    case 'secure_note':
      return {
        ...base,
        type: 'secure_note',
        content: sensitive['content'] as string,
      };
    case 'credit_card':
      return {
        ...base,
        type: 'credit_card',
        cardholderName: sensitive['cardholderName'] as string,
        cardNumber: sensitive['cardNumber'] as string,
        expirationDate: sensitive['expirationDate'] as string,
        cvv: sensitive['cvv'] as string,
      };
    case 'identity':
      return {
        ...base,
        type: 'identity',
        firstName: sensitive['firstName'] as string,
        lastName: sensitive['lastName'] as string,
        email: sensitive['email'] as string | undefined,
        phone: sensitive['phone'] as string | undefined,
        address: sensitive['address'] as string | undefined,
      };
    default:
      throw new Error(
        `Unknown vault entry type: ${(encrypted as { type: string }).type}`,
      );
  }
}
