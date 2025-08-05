import { Buffer } from 'buffer';
import { Brand } from 'ts-brand';
import { GuidBrandType } from './enumerations/guidBrandType';
import { IKeyPairBufferWithUnEncryptedPrivateKey } from './interfaces/keyPairBufferWithUnEncryptedPrivateKey';
import { ISigningKeyPrivateKeyInfo } from './interfaces/signingKeyPrivateKeyInfo';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';
import { ISimplePublicKeyOnly } from './interfaces/simplePublicKeyOnly';
import { ISimplePublicKeyOnlyBuffer } from './interfaces/simplePublicKeyOnlyBuffer';

export type KeyPairBufferWithUnEncryptedPrivateKey = Brand<
  IKeyPairBufferWithUnEncryptedPrivateKey,
  'KeyPairBufferWithUnEncryptedPrivateKey'
>;
export type SigningKeyPrivateKeyInfo = Brand<
  ISigningKeyPrivateKeyInfo,
  'SigningKeyPrivateKeyInfo'
>;
export type SimpleKeyPair = Brand<SimplePublicKeyOnly, 'SimpleKeyPair'>;
export type SimplePublicKeyOnly = Brand<
  ISimplePublicKeyOnly,
  'SimplePublicKeyOnly'
>;
export type SimpleKeyPairBuffer = Brand<
  ISimpleKeyPairBuffer,
  'SimpleKeyPairBuffer'
>;
export type SimplePublicKeyOnlyBuffer = Brand<
  ISimplePublicKeyOnlyBuffer,
  'SimplePublicKeyOnlyBuffer'
>;
export type HexString = Brand<string, 'HexString'>;
export type SignatureString = Brand<HexString, 'SignatureString'>;
export type SignatureBuffer = Buffer & Brand<Buffer, 'SignatureBuffer'>;
export type ChecksumBuffer = Buffer &
  Brand<Buffer, 'Sha3Checksum', 'ChecksumBuffer'>;
export type ChecksumString = Brand<HexString, 'Sha3Checksum', 'ChecksumString'>;

/**
 * GUID stored as a BigInt
 */
export type BigIntGuid = Brand<bigint, 'GuidV4', GuidBrandType.BigIntGuid>;
/**
 * GUID stored as a hex string with dashes
 */
export type FullHexGuid = Brand<string, 'GuidV4', GuidBrandType.FullHexGuid>;
/**
 * GUID stored as a hex string without dashes
 */
export type ShortHexGuid = Brand<string, 'GuidV4', GuidBrandType.ShortHexGuid>;
/**
 * GUID stored as a base64 string
 */
export type Base64Guid = Brand<string, 'GuidV4', GuidBrandType.Base64Guid>;
/**
 * GUID stored as a raw buffer
 */
export type RawGuidBuffer = Buffer &
  Brand<Buffer, 'GuidV4', GuidBrandType.RawGuidBuffer>;

export type EciesEncryptionType = 'simple' | 'single' | 'multiple';

/**
 * Extended Cipher type with auth tag support
 */
export interface AuthenticatedCipher {
  update(data: Buffer): Buffer;
  final(): Buffer;
  getAuthTag(): Buffer;
  setAutoPadding(autoPadding: boolean): void;
}

/**
 * Extended Decipher type with auth tag support
 */
export interface AuthenticatedDecipher {
  update(data: Buffer): Buffer;
  final(): Buffer;
  setAuthTag(tag: Buffer): void;
}

/**
 * Extended Buffer type for data blocks
 */
export type DataBlockBuffer = Buffer & {
  toBuffer(): Buffer;
  toHex(): string;
};
