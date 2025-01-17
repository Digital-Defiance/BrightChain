import { randomBytes } from 'crypto';
import {
  generateRandomKeysSync,
  KeyPair as PaillierKeyPair,
} from 'paillier-bigint';
import { MemberType } from './enumerations/memberType';
import { GuidV4 } from './guid';
import { EmailString } from './emailString';
import { IMemberDTO } from './interfaces/memberDto';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import Wallet from 'ethereumjs-wallet';
import { ShortHexGuid, SignatureBuffer } from './types';
import { StaticHelpersVoting } from './staticHelpers.voting';
/**
 * A member of Brightchain.
 * @param id The unique identifier for this member.
 * @param name The name of this member.
 */
export class BrightChainMember {
  public readonly publicKey: Buffer;
  private _wallet: Wallet | undefined;
  private _privateKey: Buffer | undefined;
  public readonly votingPublicKey: Buffer;
  public readonly encryptedVotingPrivateKey: Buffer;
  public readonly id: GuidV4;
  public readonly memberType: MemberType;
  public readonly name: string;
  public readonly contactEmail: EmailString;
  public readonly creatorId: GuidV4;
  public readonly dateCreated: Date;
  public readonly dateUpdated: Date;
  constructor(
    memberType: MemberType,
    name: string,
    contactEmail: EmailString,
    votingPublicKey: Buffer,
    encryptedVotingPrivateKey: Buffer,
    publicKey: Buffer,
    privateKey?: Buffer,
    wallet?: Wallet,
    id?: GuidV4,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: GuidV4
  ) {
    this.memberType = memberType;
    if (id !== undefined) {
      this.id = id;
    } else {
      this.id = GuidV4.new();
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
    this.votingPublicKey = votingPublicKey;
    this.encryptedVotingPrivateKey = encryptedVotingPrivateKey;
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
  public set privateKey(value: Buffer) {
    const nonce = randomBytes(32);
    const testMessage = StaticHelpersECIES.encrypt(this.publicKey, nonce);
    let testDecrypted;
    try {
      testDecrypted = StaticHelpersECIES.decrypt(value, testMessage);
    } catch (e) {
      testDecrypted = undefined;
    }
    if (
      !testDecrypted ||
      testDecrypted.toString('hex') !== nonce.toString('hex')
    ) {
      throw new Error('Incorrect or invalid private key for public key');
    }
    this._privateKey = value;
  }
  public get privateKeyLoaded(): boolean {
    return this._privateKey !== undefined;
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
    const { wallet } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
    const keyPair = StaticHelpersECIES.walletToSimpleKeyPairBuffer(wallet);
    if (keyPair.publicKey.toString('hex') !== this.publicKey.toString('hex')) {
      throw new Error('Incorrect or invalid mnemonic for public key');
    }
    this._wallet = wallet;
    this._privateKey = keyPair.privateKey;
  }

  /**
   * Sign the data using the loaded key pair.
   * @param data
   * @returns
   */
  public sign(data: Buffer): SignatureBuffer {
    return StaticHelpersECIES.signMessage(this.privateKey, data);
  }

  /**
   * Verify the data signature using the loaded key pair.
   * @param signature
   * @param data
   * @returns
   */
  public verify(signature: SignatureBuffer, data: Buffer): boolean {
    return StaticHelpersECIES.verifyMessage(this.publicKey, data, signature);
  }
  public get votingKeyPair(): PaillierKeyPair {
    const votingPublicKey = StaticHelpersVoting.bufferToVotingPublicKey(
      this.votingPublicKey
    );
    return {
      publicKey: votingPublicKey,
      privateKey: StaticHelpersVoting.encryptedPrivateKeyToKeyPair(
        this.encryptedVotingPrivateKey,
        this.privateKey,
        votingPublicKey
      ),
    };
  }

  /**
   * Create a new member and generate its keys
   * @param memberType
   * @param name
   * @param contactEmail
   * @param creator
   * @returns
   */
  public static newMember(
    memberType: MemberType,
    name: string,
    contactEmail: EmailString,
    creator?: BrightChainMember
  ): BrightChainMember {
    const newId = GuidV4.new();
    const mnemonic = StaticHelpersECIES.generateNewMnemonic();
    const { wallet } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
    const keyPair = StaticHelpersECIES.walletToSimpleKeyPairBuffer(wallet);
    const votingKeypair = generateRandomKeysSync(
      StaticHelpersVoting.votingKeyPairBitLength
    );
    return new BrightChainMember(
      memberType,
      name,
      contactEmail,
      StaticHelpersVoting.votingPublicKeyToBuffer(votingKeypair.publicKey),
      StaticHelpersVoting.keyPairToEncryptedPrivateKey(
        votingKeypair,
        keyPair.publicKey
      ),
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
  encryptData(data: string | Buffer): Buffer {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return StaticHelpersECIES.encrypt(this.publicKey, bufferData);
  }

  /**
   * Decrypts data using the private part of the data key pair.
   * @param encryptedData - The data to decrypt.
   * @returns The decrypted data.
   */
  decryptData(encryptedData: Buffer) {
    return StaticHelpersECIES.decrypt(this.privateKey, encryptedData);
  }

  toJSON(): string {
    const memberDTO: IMemberDTO = {
      id: this.id.asShortHexGuid,
      type: this.memberType,
      name: this.name,
      contactEmail: this.contactEmail.toJSON(),
      votingPublicKey: this.votingPublicKey.toString('hex'),
      encryptedVotingPrivateKey: this.encryptedVotingPrivateKey.toString('hex'),
      publicKey: this.publicKey.toString('hex'),
      createdBy: this.creatorId.asShortHexGuid as string,
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
      Buffer.from(parsedMember.votingPublicKey, 'hex'),
      Buffer.from(parsedMember.encryptedVotingPrivateKey, 'hex'),
      Buffer.from(parsedMember.publicKey, 'hex'),
      undefined,
      undefined,
      new GuidV4(parsedMember.id as ShortHexGuid),
      parsedMember.dateCreated,
      parsedMember.dateUpdated,
      new GuidV4(parsedMember.createdBy as ShortHexGuid)
    );
  }
}
