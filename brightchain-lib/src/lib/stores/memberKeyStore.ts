import { MemberKeyUse } from '../enumerations/memberKeyUse';
import { ISimpleKeyPairBuffer } from '../interfaces/simpleKeyPairBuffer';
import { ISimpleStore } from '../interfaces/simpleStore';
import { IStoredMemberKeyDTO } from '../interfaces/storedMemberKeyDto';
import { StoredMemberKey } from '../keys/storedMemberKey';
import { ec as EC } from 'elliptic';

/**
 * A store of keys by key type (signing, data, etc.)
 * TODO: implement/verify toJSON and fromJSON
 */
export class MemberKeyStore implements ISimpleStore<MemberKeyUse, StoredMemberKey> {
  private _memberKeyPairs: Map<MemberKeyUse, StoredMemberKey>;
  /**
   * Signatures and verification are done using the signing key pair.
   * The key pair may or may not be loaded.
   */
  private get _signingKeyPair(): null | EC.KeyPair {
    const signingKey = this._memberKeyPairs.get(MemberKeyUse.Signing);
    if (signingKey) {
      throw new Error('Not implemented');
      //return StaticHelpersKeyPair.decryptDataPrivateKey(this.);
    } else {
      return null;
    }
  }
  /**
   * Data to/from/for the member is encrypted using the data key pair.
   * The key pair may or may not be loaded.
   * Note that the data key is not itself associated with the signing key,
   * but is stored encrypted using the mnemonic phrase from the signing key
   */
  private get _encryptionKeyPair(): null | ISimpleKeyPairBuffer {
    const encryptionKey = this._memberKeyPairs.get(MemberKeyUse.Encryption);
    if (encryptionKey) {
      throw new Error('Not implemented');
    } else {
      return null;
    }
  }

  private get _authenticationKeyPair(): null | ISimpleKeyPairBuffer {
    const authenticationKey = this._memberKeyPairs.get(
      MemberKeyUse.Authentication
    );
    if (authenticationKey) {
      throw new Error('Not implemented');
    } else {
      return null;
    }
  }

  public get hasAuthenticationKeyPair(): boolean {
    return this._memberKeyPairs.has(MemberKeyUse.Authentication);
  }
  public get hasEncryptionKeyPair(): boolean {
    return this._memberKeyPairs.has(MemberKeyUse.Encryption);
  }

  public get hasSigningKeyPair(): boolean {
    return this._memberKeyPairs.has(MemberKeyUse.Signing);
  }

  public remove(memberKeyType: MemberKeyUse): void {
    this._memberKeyPairs.delete(memberKeyType);
  }

  public get(memberKeyType: MemberKeyUse): StoredMemberKey {
    const memberKey = this._memberKeyPairs.get(memberKeyType);
    if (memberKey) {
      return memberKey;
    }
    throw new Error('Member key not found');
  }

  constructor() {
    this._memberKeyPairs = new Map<MemberKeyUse, StoredMemberKey>();
  }
  public has(key: MemberKeyUse): boolean {
    return this._memberKeyPairs.has(key);
  }
  public hasPrivateKey(memberKeyType: MemberKeyUse): boolean {
    const memberKey = this._memberKeyPairs.get(memberKeyType);
    if (memberKey) {
      return memberKey.hasPrivateKey;
    }
    return false;
  }
  public set(memberKeyType: MemberKeyUse, memberKey: StoredMemberKey): void {
    if (memberKeyType !== memberKey.keyUse) {
      throw new Error('Member key type mismatch');
    }
    this._memberKeyPairs.set(memberKeyType, memberKey);
  }
  public load(): void {
    throw new Error('Method not implemented.');
  }
  public save(): void {
    throw new Error('Method not implemented.');
  }
  public toJSON(): any {
    // dont include private keys
    const json: { [key: string]: IStoredMemberKeyDTO } = {};
    this._memberKeyPairs.forEach((memberKey, memberKeyType) => {
      json[memberKeyType] = memberKey.toJSON();
    });
    return json;
  }
  public static fromJSON(json: { [key: string]: IStoredMemberKeyDTO }): MemberKeyStore {
    const newStore = new MemberKeyStore();
    const errors: { [key: string]: any } = {};
    Object.keys(json).forEach((memberKeyType: string) => {
      const memberKeyTypeEnum = memberKeyType as MemberKeyUse;
      try {
        const memberKey: StoredMemberKey = StoredMemberKey.fromJSON(json[memberKeyTypeEnum]);
        newStore.set(memberKeyTypeEnum, memberKey);
      } catch (error) {
        errors[memberKeyTypeEnum] = error;
      }
    });
    if (Object.keys(errors).length > 0) {
      throw new Error(JSON.stringify(errors));
    }
    return newStore;
  }
}
