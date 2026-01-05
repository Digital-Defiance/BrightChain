import { Buffer } from 'buffer';

// Re-export types from ecies-lib for backward compatibility
export type {
  Base64Guid,
  BigIntGuid,
  ChecksumString,
  ChecksumUint8Array,
  FullHexGuid,
  HexString,
  RawGuidBuffer as RawGuidUint8Array,
  ShortHexGuid,
  SignatureString,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';

// Re-export node-specific types from node-ecies-lib
export type {
  ChecksumBuffer,
  DataBuffer,
  KeyPairBufferWithUnEncryptedPrivateKey,
  SignatureBuffer,
  SigningKeyPrivateKeyInfo,
  SimpleKeyPair,
  SimpleKeyPairBuffer,
  SimplePublicKeyOnly,
  SimplePublicKeyOnlyBuffer,
} from '@digitaldefiance/node-ecies-lib';

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  return Buffer.from(arr).toString('hex');
}

/**
 * Enum language translation type (stub for backward compatibility)
 * @deprecated This type is deprecated
 */
export type EnumLanguageTranslation<_T> = Record<
  string,
  Record<string | number, string>
>;

/**
 * Create translations helper (stub for backward compatibility)
 * @deprecated This function is deprecated
 */
export function createTranslations<T>(translations: T): T {
  return translations;
}
