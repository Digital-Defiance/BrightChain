import { StaticHelpersKeyPair } from "../staticHelpers.keypair";
import { AuthenticationKey, EncryptionKey, MemberKeyTypeBrand, SigningKey, StoredAuthenticationKey, StoredEncryptionKey, StoredSigningKey } from "../types";
import { KeyType } from "../enumerations/keyType";
import { ec as EC } from "elliptic";
import { MemberKeyUse } from "../enumerations/memberKeyUse";
import { IStoredMemberKey } from "../interfaces/storedMemberKey";
import { ISimpleKeyPairBuffer } from "../interfaces/simpleKeyPairBuffer";
import { IStoredMemberKeyDTO } from "../interfaces/storedMemberKeyDto";

export class StoredMemberKey implements IStoredMemberKey {
    public readonly keyType: KeyType;
    public readonly keyUse: MemberKeyUse;
    /**
     * The public key is always stored, plain text
     */
    public readonly publicKey: Buffer;
    /**
     * The private key, if provided, is stored encrypted using a secure string
     * If the private key is not stored, it will be undefined
     */
    private readonly _privateKey?: Buffer;
    constructor(type: KeyType, keyUse: MemberKeyUse, publicKey: Buffer, privateKey?: Buffer) {
        this.keyType = type;
        this.keyUse = keyUse;
        this.publicKey = publicKey;
        this._privateKey = privateKey && privateKey.length > 0 ? privateKey : undefined;
        if (privateKey && privateKey.length == 0) {
            throw new Error("Private key provided but zero length");
        }
    }
    public get privateKey(): Buffer {
        if (this._privateKey === undefined) {
            return Buffer.alloc(0);
        }
        return this._privateKey;
    }
    public get hasPrivateKey(): boolean {
        return this.privateKey !== undefined && this.privateKey.length > 0;
    }
    public get simpleKeyPairBuffer(): ISimpleKeyPairBuffer {
        const simpleKeyBuffer: ISimpleKeyPairBuffer = {
            publicKey: this.publicKey,
            privateKey: this._privateKey === undefined ? Buffer.alloc(0) : this._privateKey,
        }
        return simpleKeyBuffer;
    }

    public is(type: MemberKeyUse | StoredAuthenticationKey | StoredEncryptionKey | StoredSigningKey | AuthenticationKey | EncryptionKey | SigningKey): boolean {
        // MemberKeyType is a MemberKeyType string enum
        // AuthenticationKey is a KeyType string enum
        if (typeof type === 'string') {
            return (this.keyUse === (type as MemberKeyUse)) || (this.keyUse === (type as MemberKeyTypeBrand));
            // StoredAuthenticationKey is a StoredMemberKey with a type of Authentication
        } else if (type instanceof StoredMemberKey) {
            return this.keyUse === (type as StoredMemberKey).keyUse;
        } else {
            return false;
        }
    }
    public static newAuthenticationKey(publicKey: Buffer, privateKey: Buffer): StoredAuthenticationKey {
        return new StoredMemberKey(KeyType.Ed25519, MemberKeyUse.Authentication, publicKey, privateKey) as StoredAuthenticationKey;
    }
    public static newEncryptionKey(publicKey: Buffer, privateKey: Buffer): StoredEncryptionKey {
        return new StoredMemberKey(KeyType.Rsa4096, MemberKeyUse.Encryption, publicKey, privateKey) as StoredEncryptionKey;
    }
    public static newSigningKey(publicKey: Buffer, privateKey: Buffer): StoredSigningKey {
        return new StoredMemberKey(KeyType.Ed25519, MemberKeyUse.Signing, publicKey, privateKey) as StoredSigningKey;
    }
    public static fromECKeyPair(keyPair: EC.KeyPair, keyUse: MemberKeyUse): StoredMemberKey {
        const simpleKeyBuffer: ISimpleKeyPairBuffer = StaticHelpersKeyPair.convertECKeyPairToISimpleKeyPairBuffer(keyPair);
        return new StoredMemberKey(KeyType.Ed25519, keyUse, simpleKeyBuffer.publicKey, simpleKeyBuffer.privateKey);
    }
    public toECKeyPair(): EC.KeyPair {
        const simpleKeyBuffer: ISimpleKeyPairBuffer = {
            publicKey: this.publicKey,
            privateKey: this._privateKey === undefined ? Buffer.alloc(0) : this._privateKey,
        }
        return StaticHelpersKeyPair.simpleKeyPairBufferToValidatedECKeyPair(simpleKeyBuffer);
    }
    public toJSON(): IStoredMemberKeyDTO {
        // dont serialize the private key
        return {
            keyType: this.keyType,
            keyUse: this.keyUse,
            publicKey: this.publicKey.toString('base64'),
        }
    }
    public static fromJSON(json: IStoredMemberKeyDTO): StoredMemberKey {
        return new StoredMemberKey(
            json.keyType,
            json.keyUse,
            Buffer.from(json.publicKey, 'base64'),
            json.privateKey === undefined ? undefined : Buffer.from(json.privateKey, 'base64'),
        );
    }
}