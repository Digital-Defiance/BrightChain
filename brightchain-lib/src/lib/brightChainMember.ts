import * as uuid from 'uuid';
import { randomBytes } from 'crypto';
import { MemberType } from './enumerations/memberType';
import { GuidV4, ShortHexGuid } from './guid';
import { EmailString } from './emailString';
import { IReadOnlyBasicObjectDTO } from './interfaces/readOnlyBasicObjectDto';
import { IMemberDTO } from './interfaces/memberDto';
import { EthereumECIES } from './ethereumECIES';
import Wallet from 'ethereumjs-wallet';
/**
 * A member of Brightchain.
 * @param id The unique identifier for this member.
 * @param name The name of this member.
 */
export class BrightChainMember implements IReadOnlyBasicObjectDTO {
  public readonly publicKey: Buffer;
  private _wallet: Wallet | undefined;
  private _privateKey: Buffer | undefined;
  public readonly id: ShortHexGuid;
  public readonly memberType: MemberType;
  public readonly name: string;
  public readonly contactEmail: EmailString;
  public readonly creatorId: ShortHexGuid;
  public readonly dateCreated: Date;
  public readonly dateUpdated: Date;
  constructor(
    memberType: MemberType,
    name: string,
    contactEmail: EmailString,
    publicKey: Buffer,
    privateKey?: Buffer,
    wallet?: Wallet,
    id?: ShortHexGuid,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: ShortHexGuid
  ) {
    this.memberType = memberType;
    if (id !== undefined) {
      let newGuid: GuidV4;
      try {
        newGuid = new GuidV4(id);
      } catch (e) {
        throw new Error('Invalid member ID');
      }
      this.id = newGuid.asShortHexGuid;
    } else {
      this.id = GuidV4.new().asShortHexGuid;
    }
    this.name = name;
    if (!this.name || this.name.length == 0) {
      throw new Error('Member name missing');
    }
    if (this.name.trim() != this.name) {
      throw new Error('Member name has leading or trailing spaces');
    }
    this.contactEmail = contactEmail;

    this.publicKey = publicKey;
    this._privateKey = privateKey;
    this._wallet = wallet;

    // don't create a new date object with nearly identical values to the existing one
    let _now: null | Date = null;
    const now = function () {
      if (!_now) {
        _now = new Date();
      }
      return _now;
    };
    this.dateCreated = dateCreated ?? now();
    this.dateUpdated = dateUpdated ?? now();
    this.creatorId = creatorId ?? this.id;
  }
  public get hasPrivateKey(): boolean {
    return this._privateKey !== undefined;
  }
  public get privateKey(): Buffer {
    if (!this._privateKey) {
      throw new Error('No private key');
    }
    return this._privateKey;
  }
  public get privateKeyLoaded(): boolean {
    return this._privateKey !== undefined;
  }
  public set privateKey(value: Buffer) {
    const nonce = randomBytes(32);
    const testMessage = EthereumECIES.encrypt(this.publicKey, nonce);
    let testDecrypted;
    try {
      testDecrypted = EthereumECIES.decrypt(value, testMessage);
    }
    catch (e) {
    }
    if (!testDecrypted || testDecrypted.toString('hex') !== nonce.toString('hex')) {
      throw new Error('Incorrect or invalid private key for public key');
    }
    this._privateKey = value;
  }
  public get wallet(): Wallet {
    if (!this._wallet) {
      throw new Error('No wallet');
    }
    return this._wallet;
  }
  public unloadPrivateKey(): void {
    this._privateKey = undefined;
  }
  public unloadWallet(): void {
    this._wallet = undefined;
  }
  public unloadWalletAndPrivateKey(): void {
    this.unloadWallet();
    this.unloadPrivateKey();
  }
  public loadWallet(mnemonic: string): void {
    if (this._wallet) {
      throw new Error('Wallet already loaded');
    }
    const { wallet, seed } = EthereumECIES.walletAndSeedFromMnemonic(mnemonic);
    const keyPair = EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
    if (keyPair.publicKey.toString('hex') !== this.publicKey.toString('hex')) {
      throw new Error('Incorrect or invalid mnemonic for public key');
    }
    this._wallet = wallet;
    this._privateKey = keyPair.privateKey;
  }

  /**
   * Sign the data using the loaded key pair.
   * @param data
   * @param options
   * @returns
   */
  public sign(data: Buffer): Buffer {
    if (!this.hasPrivateKey) {
      throw new Error('No key pair');
    }
    const signature = EthereumECIES.signMessage(data, this.privateKey);
    return signature;
  }

  /**
   * Verify the data signature using the loaded key pair.
   * @param signature
   * @param data
   * @returns
   */
  public verify(signature: Buffer, data: Buffer): boolean {
    return EthereumECIES.verifyMessage(this.publicKey, data, signature);
  }

  // public publicEncrypt(data: Buffer): Buffer {
  //   if (!this._signingKeyPair) {
  //     throw new Error('No key pair');
  //   }
  //   return publicEncrypt(this._signingKeyPair.getPublic(), data);
  // }

  /**
   * Create a new member and generate its keys
   * @param type
   * @param name
   * @param contactEmail
   * @returns
   */
  public static newMember(
    memberType: MemberType,
    name: string,
    contactEmail: EmailString,
    creator?: BrightChainMember
  ): BrightChainMember {
    const newId = new GuidV4(uuid.v4()).asShortHexGuid;
    const mnemonic = EthereumECIES.generateNewMnemonic();
    const { seed, wallet } = EthereumECIES.walletAndSeedFromMnemonic(mnemonic);
    const keyPair = EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
    return new BrightChainMember(
      memberType,
      name,
      contactEmail,
      keyPair.publicKey,
      keyPair.privateKey,
      wallet,
      newId,
      undefined,
      undefined,
      creator?.id ?? newId
    );
    // TODO: question: should creatorId only be allowed to be the same as the ID for the first member/node agent/creator?
  }

  /**
   * Encrypts data using the public part of the data key pair.
   * @param data - The data to encrypt.
   * @returns The encrypted data.
   */
  encryptData(data: string | Buffer, publicKey?: Buffer): Buffer {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return EthereumECIES.encrypt(publicKey ?? this.publicKey, bufferData);
  }

  /**
   * Decrypts data using the private part of the data key pair.
   * @param encryptedData - The data to decrypt.
   * @returns The decrypted data.
   */
  decryptData(encryptedData: Buffer) {
    return EthereumECIES.decrypt(this.privateKey, encryptedData);
  }

  toJSON(): string {
    const memberDTO: IMemberDTO = {
      id: this.id,
      type: this.memberType,
      name: this.name,
      contactEmail: this.contactEmail.toJSON(),
      publicKey: this.publicKey.toString('hex'),
      createdBy: this.creatorId as string,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };

    return JSON.stringify(memberDTO);
  }
  fromJSON(json: string): BrightChainMember {
    const parsedMember: IMemberDTO = JSON.parse(json) as IMemberDTO;
    console.log('parsedMember', parsedMember);
    const contactEmail = new EmailString(parsedMember.contactEmail);

    return new BrightChainMember(
      parsedMember.type,
      parsedMember.name,
      contactEmail,
      Buffer.from(parsedMember.publicKey, 'hex'),
      undefined,
      undefined,
      parsedMember.id as ShortHexGuid,
      parsedMember.dateCreated,
      parsedMember.dateUpdated,
      parsedMember.createdBy as ShortHexGuid
    );
  }
}
