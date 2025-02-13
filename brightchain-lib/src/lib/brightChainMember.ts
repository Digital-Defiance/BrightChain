import { createECDH, randomBytes } from 'crypto';
import Wallet from 'ethereumjs-wallet';
import {
  KeyPair as PaillierKeyPair,
  PrivateKey,
  PublicKey,
} from 'paillier-bigint';
import { ECIES } from './constants';
import { EmailString } from './emailString';
import { MemberErrorType } from './enumerations/memberErrorType';
import { MemberType } from './enumerations/memberType';
import { MemberError } from './errors/memberError';
import { GuidV4 } from './guid';
import { IMemberDTO } from './interfaces/memberDto';
import { IMemberWithMnemonic } from './interfaces/memberWithMnemonic';
import { ECIESService } from './services/ecies.service';
import { VotingService } from './services/voting.service';
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
  private readonly eciesService: ECIESService;
  public readonly publicKey: Buffer;
  private _wallet: Wallet | undefined;
  private _privateKey: Buffer | undefined;
  private _votingPrivateKey: PrivateKey | undefined;
  private readonly _votingPublicKey: PublicKey;
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
    publicKey: Buffer,
    votingPublicKey: PublicKey,
    privateKey?: Buffer,
    wallet?: Wallet,
    id?: GuidV4,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: GuidV4,
  ) {
    this.eciesService = new ECIESService();
    this.memberType = memberType;
    if (id !== undefined) {
      this.id = id;
    } else {
      this.id = GuidV4.new();
    }
    this.name = name;
    if (!this.name || this.name.length == 0) {
      throw new MemberError(MemberErrorType.MissingMemberName);
    }
    if (this.name.trim() != this.name) {
      throw new MemberError(MemberErrorType.InvalidMemberNameWhitespace);
    }
    this.contactEmail = contactEmail;

    this.publicKey = publicKey;
    this._votingPublicKey = votingPublicKey;
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
    if (privateKey) {
      const { privateKey: _votingPrivateKey } =
        VotingService.deriveVotingKeysFromECDH(privateKey, publicKey);
      this._votingPrivateKey = _votingPrivateKey;
    }
  }

  public get votingPublicKey(): PublicKey {
    if (!this._votingPublicKey) {
      throw new MemberError(MemberErrorType.MissingVotingPublicKey);
    }
    return this._votingPublicKey;
  }

  public get votingPrivateKey(): PrivateKey {
    if (!this._votingPrivateKey) {
      throw new MemberError(MemberErrorType.MissingVotingPrivateKey);
    }
    return this._votingPrivateKey;
  }

  public get hasPrivateKey(): boolean {
    return this._privateKey !== undefined;
  }

  public get privateKey(): Buffer {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    return this._privateKey;
  }

  public set privateKey(value: Buffer) {
    const nonce = randomBytes(32);
    // Ensure 0x04 prefix for encryption
    const publicKeyForEncryption =
      this.publicKey[0] === ECIES.PUBLIC_KEY_MAGIC
        ? this.publicKey
        : Buffer.concat([
            Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
            this.publicKey,
          ]);
    const testMessage = this.eciesService.encrypt(
      publicKeyForEncryption,
      nonce,
    );
    let testDecrypted;
    try {
      testDecrypted = this.eciesService.decryptWithHeader(value, testMessage);
    } catch (e) {
      testDecrypted = undefined;
    }
    if (
      !testDecrypted ||
      testDecrypted.toString('hex') !== nonce.toString('hex')
    ) {
      throw new MemberError(MemberErrorType.IncorrectOrInvalidPrivateKey);
    }
    this._privateKey = value;
  }

  public get privateKeyLoaded(): boolean {
    return this._privateKey !== undefined;
  }

  public get wallet(): Wallet {
    if (!this._wallet) {
      throw new MemberError(MemberErrorType.NoWallet);
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
      throw new MemberError(MemberErrorType.WalletAlreadyLoaded);
    }
    const { wallet } = this.eciesService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKey = wallet.getPublicKey();
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      publicKey,
    ]);

    if (
      publicKeyWithPrefix.toString('hex') !== this.publicKey.toString('hex')
    ) {
      throw new MemberError(MemberErrorType.InvalidMnemonic);
    }
    this._wallet = wallet;
    this._privateKey = privateKey;
  }

  public deriveVotingKeyPair(): void {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    const { privateKey: votingPrivateKey } =
      VotingService.deriveVotingKeysFromECDH(this._privateKey, this.publicKey);
    this._votingPrivateKey = votingPrivateKey;
  }

  /**
   * Sign the data using the loaded key pair.
   * @param data
   * @returns
   */
  public sign(data: Buffer): SignatureBuffer {
    return this.eciesService.signMessage(this.privateKey, data);
  }

  /**
   * Verify the data signature using the loaded key pair.
   * @param signature
   * @param data
   * @returns
   */
  public verify(signature: SignatureBuffer, data: Buffer): boolean {
    return this.eciesService.verifyMessage(this.publicKey, data, signature);
  }

  /**
   * Get the voting key pair derived from ECDH keys.
   * Public key can be derived by anyone with the ECDH public key.
   * Private key can only be derived by someone with the ECDH private key.
   */
  public get votingKeyPair(): PaillierKeyPair {
    // Get raw public key (without 0x04 prefix)
    const rawPublicKey =
      this.publicKey[0] === ECIES.PUBLIC_KEY_MAGIC
        ? this.publicKey.subarray(1)
        : this.publicKey;

    // Derive voting keys from ECDH keys
    if (!this._privateKey) {
      throw new MemberError(
        MemberErrorType.PrivateKeyRequiredToDeriveVotingKeyPair,
      );
    }

    return VotingService.deriveVotingKeysFromECDH(
      this._privateKey,
      rawPublicKey,
    );
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
  ): IMemberWithMnemonic {
    // Validate inputs first
    if (!name || name.length == 0) {
      throw new MemberError(MemberErrorType.MissingMemberName);
    }
    if (name.trim() != name) {
      throw new MemberError(MemberErrorType.InvalidMemberNameWhitespace);
    }
    if (!contactEmail || contactEmail.toString().length == 0) {
      throw new MemberError(MemberErrorType.MissingEmail);
    }
    if (contactEmail.toString().trim() != contactEmail.toString()) {
      throw new MemberError(MemberErrorType.InvalidEmailWhitespace);
    }

    const eciesService = new ECIESService();
    const newId = GuidV4.new();
    const mnemonic = eciesService.generateNewMnemonic();
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

    // Get private key from wallet
    const privateKey = wallet.getPrivateKey();
    // Get public key with 0x04 prefix
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      wallet.getPublicKey(),
    ]);

    // Create ECDH instance for key derivation
    const ecdh = createECDH(eciesService.curveName);
    ecdh.setPrivateKey(privateKey);

    // Derive voting keys using the private key and public key
    const votingKeypair = VotingService.deriveVotingKeysFromECDH(
      privateKey,
      publicKeyWithPrefix,
    );

    return {
      member: new BrightChainMember(
        memberType,
        name,
        contactEmail,
        publicKeyWithPrefix, // Store with prefix
        votingKeypair.publicKey,
        privateKey,
        wallet,
        newId,
        undefined,
        undefined,
        creator?.id ?? newId,
      ),
      mnemonic,
    };
  }

  /**
   * Encrypts data using the public part of the data key pair.
   * @param data - The data to encrypt.
   * @returns The encrypted data.
   */
  public encryptData(data: string | Buffer): Buffer {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    // Create ECDH instance for encryption
    const ecdh = createECDH(this.eciesService.curveName);
    // Generate ephemeral key pair
    ecdh.generateKeys();
    // Use public key directly since it's already in ECDH format
    return this.eciesService.encrypt(this.publicKey, bufferData);
  }

  /**
   * Decrypts data using the private part of the data key pair.
   * @param encryptedData - The data to decrypt.
   * @returns The decrypted data.
   */
  public decryptData(encryptedData: Buffer) {
    // Create ECDH instance for decryption
    const ecdh = createECDH(this.eciesService.curveName);
    // Set private key
    ecdh.setPrivateKey(this.privateKey);
    return this.eciesService.decryptWithHeader(this.privateKey, encryptedData);
  }

  public toJson(): string {
    const memberDTO: IMemberDTO = {
      id: this.id.asShortHexGuid,
      type: this.memberType,
      name: this.name,
      contactEmail: this.contactEmail.toString(),
      publicKey: this.publicKey.toString('base64'),
      votingPublicKey: VotingService.votingPublicKeyToBuffer(
        this.votingPublicKey,
      ).toString('base64'),
      createdBy: this.creatorId.asShortHexGuid as string,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };

    return JSON.stringify(memberDTO);
  }

  public static fromJson(json: string): BrightChainMember {
    const parsedMember: IMemberDTO = JSON.parse(json) as IMemberDTO;
    const contactEmail = new EmailString(parsedMember.contactEmail);

    return new BrightChainMember(
      parsedMember.type,
      parsedMember.name,
      contactEmail,
      Buffer.from(parsedMember.publicKey, 'base64'),
      VotingService.bufferToVotingPublicKey(
        Buffer.from(parsedMember.votingPublicKey, 'base64'),
      ),
      undefined,
      undefined,
      new GuidV4(parsedMember.id as ShortHexGuid),
      parsedMember.dateCreated,
      parsedMember.dateUpdated,
      new GuidV4(parsedMember.createdBy as ShortHexGuid),
    );
  }
}
