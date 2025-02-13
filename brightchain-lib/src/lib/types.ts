import { Brand } from 'ts-brand';
import { GuidBrandType } from './enumerations/guidBrandType';
import { IKeyPairBufferWithUnEncryptedPrivateKey } from './interfaces/keyPairBufferWithUnEncryptedPrivateKey';
import { ISigningKeyPrivateKeyInfo } from './interfaces/signgingKeyPrivateKeyInfo';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';
import { ISimplePublicKeyOnly } from './interfaces/simplePublicKeyOnly';
import { ISimplePublicKeyOnlyBuffer } from './interfaces/simplePublicKeyOnlyBuffer';
import { SerializableBuffer } from './serializableBuffer';

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
export type SignatureBuffer = Brand<SerializableBuffer, 'SignatureBuffer'>;
export type ChecksumBuffer = Brand<
  SerializableBuffer,
  'Sha3Checksum',
  'ChecksumBuffer'
>;
export type ChecksumString = Brand<HexString, 'Sha3Checksum', 'ChecksumString'>;

export type BigIntGuid = Brand<bigint, 'GuidV4', GuidBrandType.BigIntGuid>;
export type FullHexGuid = Brand<string, 'GuidV4', GuidBrandType.FullHexGuid>;
export type ShortHexGuid = Brand<string, 'GuidV4', GuidBrandType.ShortHexGuid>;
export type Base64Guid = Brand<string, 'GuidV4', GuidBrandType.Base64Guid>;
export type RawGuidBuffer = Brand<
  SerializableBuffer,
  'GuidV4',
  GuidBrandType.RawGuidBuffer
>;
