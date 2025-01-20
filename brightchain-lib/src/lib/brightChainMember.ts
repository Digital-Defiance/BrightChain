import { createECDH, randomBytes } from 'crypto';
import Wallet from 'ethereumjs-wallet';
import {
  generateRandomKeysSync,
  KeyPair as PaillierKeyPair,
} from 'paillier-bigint';
import { EmailString } from './emailString';
import { MemberType } from './enumerations/memberType';
import { GuidV4 } from './guid';
import { IMemberDTO } from './interfaces/memberDto';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { StaticHelpersVoting } from './staticHelpers.voting';
import { ShortHexGuid, SignatureBuffer } from './types';

/**
 * A member of Brightchain.
 * In the Owner Free Filesystem (OFF), members are used to:
 * 1. Sign and verify blocks
 * 2. Encrypt and decrypt data
 * 3. Participate in voting
 * 4. Establish ownership of blocks
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
    creatorId?: GuidV4,
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

  /**
   * Create an anonymous member for use with blocks that don't need a real owner.
   * In the Owner Free Filesystem (OFF), anonymous members are used for:
   * 1. Temporary blocks during processing
   * 2. System-generated blocks
   * 3. Blocks that don't require ownership tracking
   */
  public static anonymous(): BrightChainMember {
    const mnemonic = StaticHelpersECIES.generateNewMnemonic();
    const { wallet } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);

    // Create ECDH key pair for consistent format
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();
    const privateKey = ecdh.getPrivateKey();
    // Get public key in uncompressed format (includes 0x04 prefix)
    const publicKey = ecdh.getPublicKey(null, 'uncompressed');

    // Generate voting keys first
    const votingKeypair = generateRandomKeysSync(
      StaticHelpersVoting.votingKeyPairBitLength,
    );

    // Create voting key buffers
    const votingPublicKeyBuffer = StaticHelpersVoting.votingPublicKeyToBuffer(
      votingKeypair.publicKey,
    );
    // Use raw public key for encryption
    const encryptedVotingPrivateKeyBuffer =
      StaticHelpersVoting.keyPairToEncryptedPrivateKey(
        votingKeypair,
        publicKey, // Pass raw public key without prefix
      );

    // Create member with all keys
    return new BrightChainMember(
      MemberType.Anonymous,
      'Anonymous',
      new EmailString('anonymous@brightchain.org'),
      votingPublicKeyBuffer,
      encryptedVotingPrivateKeyBuffer,
      publicKey,
      privateKey,
      wallet,
    );
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
    // Ensure 0x04 prefix for encryption
    const publicKeyForEncryption =
      this.publicKey[0] === 0x04
        ? this.publicKey
        : Buffer.concat([Buffer.from([0x04]), this.publicKey]);
    const testMessage = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      nonce,
    );
    let testDecrypted;
    try {
      testDecrypted = StaticHelpersECIES.decryptWithHeader(value, testMessage);
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
    const privateKey = wallet.getPrivateKey();
    const publicKey = wallet.getPublicKey();
    const publicKeyWithPrefix = Buffer.concat([Buffer.from([0x04]), publicKey]);

    if (
      publicKeyWithPrefix.toString('hex') !== this.publicKey.toString('hex')
    ) {
      throw new Error('Incorrect or invalid mnemonic for public key');
    }
    this._wallet = wallet;
    this._privateKey = privateKey;
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
      this.votingPublicKey,
    );
    return {
      publicKey: votingPublicKey,
      privateKey: StaticHelpersVoting.encryptedPrivateKeyToKeyPair(
        this.encryptedVotingPrivateKey,
        this.privateKey,
        votingPublicKey,
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
    creator?: BrightChainMember,
  ): BrightChainMember {
    const newId = GuidV4.new();
    const mnemonic = StaticHelpersECIES.generateNewMnemonic();
    const { wallet } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);

    // Create ECDH key pair for consistent format
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.setPrivateKey(wallet.getPrivateKey());
    const privateKey = ecdh.getPrivateKey();
    // Get raw public key in uncompressed format (includes 0x04 prefix)
    const publicKeyWithPrefix = ecdh.getPublicKey(null, 'uncompressed');

    const votingKeypair = generateRandomKeysSync(
      StaticHelpersVoting.votingKeyPairBitLength,
    );

    return new BrightChainMember(
      memberType,
      name,
      contactEmail,
      StaticHelpersVoting.votingPublicKeyToBuffer(votingKeypair.publicKey),
      StaticHelpersVoting.keyPairToEncryptedPrivateKey(
        votingKeypair,
        publicKeyWithPrefix, // Use public key with prefix, StaticHelpersVoting will handle removing it
      ),
      publicKeyWithPrefix, // Store with prefix
      privateKey,
      wallet,
      newId,
      undefined,
      undefined,
      creator?.id ?? newId,
    );
  }

  /**
   * Encrypts data using the public part of the data key pair.
   * @param data - The data to encrypt.
   * @returns The encrypted data.
   */
  encryptData(data: string | Buffer): Buffer {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    // Create ECDH instance for encryption
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    // Generate ephemeral key pair
    ecdh.generateKeys();
    // Use public key directly since it's already in ECDH format
    return StaticHelpersECIES.encrypt(this.publicKey, bufferData);
  }

  /**
   * Decrypts data using the private part of the data key pair.
   * @param encryptedData - The data to decrypt.
   * @returns The decrypted data.
   */
  decryptData(encryptedData: Buffer) {
    // Create ECDH instance for decryption
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    // Set private key
    ecdh.setPrivateKey(this.privateKey);
    return StaticHelpersECIES.decryptWithHeader(this.privateKey, encryptedData);
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
      new GuidV4(parsedMember.createdBy as ShortHexGuid),
    );
  }
}
