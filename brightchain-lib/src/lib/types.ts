import { Brand } from "ts-brand";
import { IKeyPairBufferWithUnEncryptedPrivateKey } from "./interfaces/keyPairBufferWithUnEncryptedPrivateKey";
import { ISigningKeyPrivateKeyInfo } from "./interfaces/signgingKeyPrivateKeyInfo";
import { ISimplePublicKeyOnly } from "./interfaces/simplePublicKeyOnly";
import { ISimplePublicKeyOnlyBuffer } from "./interfaces/simplePublicKeyOnlyBuffer";
import { ISimpleKeyPairBuffer } from "./interfaces/simpleKeyPairBuffer";
import { KeyType } from "./enumerations/keyType";
import { MemberKeyUse } from "./enumerations/memberKeyUse";
import { StoredMemberKey } from "./keys/storedMemberKey";

export type EncryptedShares = Array<string>;
export type KeyTypeString = KeyType.Ed25519 | KeyType.Secp256k1 | KeyType.Rsa4096;
export type MemberKeyTypeBrand = Brand<MemberKeyUse, 'MemberKey', 'MemberKeyType'>;
export type AuthenticationKey = Brand<MemberKeyUse, 'MemberKey', MemberKeyUse.Authentication>;
export type EncryptionKey = Brand<MemberKeyUse, 'MemberKey', MemberKeyUse.Encryption>;
export type SigningKey = Brand<MemberKeyUse, 'MemberKey', MemberKeyUse.Signing>;
export type StoredKeyType = Brand<StoredMemberKey, 'MemberKey', MemberKeyUse>;
export type StoredAuthenticationKey = Brand<StoredKeyType, 'MemberKey', MemberKeyUse.Authentication>;
export type StoredEncryptionKey = Brand<StoredKeyType, 'MemberKey', MemberKeyUse.Encryption>;
export type StoredSigningKey = Brand<StoredKeyType, 'MemberKey', MemberKeyUse.Signing>;
export type KeyPairBufferWithUnEncryptedPrivateKey = Brand<IKeyPairBufferWithUnEncryptedPrivateKey, 'KeyPairBufferWithUnEncryptedPrivateKey'>;
export type SigningKeyPrivateKeyInfo = Brand<ISigningKeyPrivateKeyInfo, 'SigningKeyPrivateKeyInfo'>;
export type SimpleKeyPair = Brand<SimplePublicKeyOnly, 'SimpleKeyPair'>;
export type SimplePublicKeyOnly = Brand<ISimplePublicKeyOnly, 'SimplePublicKeyOnly'>;
export type SimpleKeyPairBuffer = Brand<ISimpleKeyPairBuffer, 'SimpleKeyPairBuffer'>;
export type SimplePublicKeyOnlyBuffer = Brand<ISimplePublicKeyOnlyBuffer, 'SimplePublicKeyOnlyBuffer'>;
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