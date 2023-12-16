import { Brand } from "ts-brand";
import { IKeyPairBufferWithUnEncryptedPrivateKey } from "./interfaces/keyPairBufferWithUnEncryptedPrivateKey";
import { ISigningKeyPrivateKeyInfo } from "./interfaces/signgingKeyPrivateKeyInfo";
import { ISimplePublicKeyOnly } from "./interfaces/simplePublicKeyOnly";
import { ISimplePublicKeyOnlyBuffer } from "./interfaces/simplePublicKeyOnlyBuffer";
import { ISimpleKeyPairBuffer } from "./interfaces/simpleKeyPairBuffer";
import { GuidBrandType } from "./enumerations/guidBrandType";

export type KeyPairBufferWithUnEncryptedPrivateKey = Brand<IKeyPairBufferWithUnEncryptedPrivateKey, 'KeyPairBufferWithUnEncryptedPrivateKey'>;
export type SigningKeyPrivateKeyInfo = Brand<ISigningKeyPrivateKeyInfo, 'SigningKeyPrivateKeyInfo'>;
export type SimpleKeyPair = Brand<SimplePublicKeyOnly, 'SimpleKeyPair'>;
export type SimplePublicKeyOnly = Brand<ISimplePublicKeyOnly, 'SimplePublicKeyOnly'>;
export type SimpleKeyPairBuffer = Brand<ISimpleKeyPairBuffer, 'SimpleKeyPairBuffer'>;
export type SimplePublicKeyOnlyBuffer = Brand<ISimplePublicKeyOnlyBuffer, 'SimplePublicKeyOnlyBuffer'>;
export type HexString = Brand<string, 'HexString'>;
export type ChecksumBuffer = Brand<
  Buffer,
  'Sha3Checksum',
  'ChecksumBuffer'
>;
export type ChecksumString = Brand<
  string,
  'Sha3Checksum',
  'ChecksumString'
>;

export type FullHexGuidBuffer = Brand<
  Buffer,
  'GuidV4',
  GuidBrandType.FullHexGuid
>;
export type ShortHexGuidBuffer = Brand<
  Buffer,
  'GuidV4',
  GuidBrandType.ShortHexGuid
>;
export type Base64GuidBuffer = Brand<
  Buffer,
  'GuidV4',
  GuidBrandType.Base64Guid
>;
export type BigIntGuid = Brand<bigint, 'GuidV4', GuidBrandType.BigIntGuid>;
export type FullHexGuid = Brand<
  string,
  'GuidV4',
  GuidBrandType.FullHexGuidBuffer
>;
export type ShortHexGuid = Brand<
  string,
  'GuidV4',
  GuidBrandType.ShortHexGuidBuffer
>;
export type Base64Guid = Brand<
  string,
  'GuidV4',
  GuidBrandType.Base64GuidBuffer
>;
export type RawGuidBuffer = Brand<
  Buffer,
  'GuidV4',
  GuidBrandType.RawGuidBuffer
>;
