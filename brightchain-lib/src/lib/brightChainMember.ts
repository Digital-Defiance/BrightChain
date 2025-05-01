import { createECDH } from 'crypto';
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
import { IBrightChainMemberOperational } from './interfaces/member/operational';
import { IMemberStorageData } from './interfaces/member/storage';
import { IsolatedPrivateKey } from './isolatedPrivateKey';
import { SecureString } from './secureString';
import { ECIESService } from './services/ecies.service';
// Removed: import { ServiceProvider } from './services/service.provider';
import { VotingService } from './services/voting.service';
import { SignatureBuffer } from './types';

/**
 * A member of Brightchain.
 * In the Owner Free Filesystem (OFF), members are used to:
 * 1. Sign and verify blocks
 * 2. Encrypt and decrypt data
 * 3. Participate in voting
 * 4. Establish ownership of blocks
 */
export class BrightChainMember implements IBrightChainMemberOperational {
  private readonly _eciesService: ECIESService;
  private readonly _votingService: VotingService;
  private readonly _id: GuidV4;
  private readonly _type: MemberType;
  private readonly _name: string;
  private readonly _email: EmailString;
  private readonly _publicKey: Buffer;
  private readonly _votingPublicKey: PublicKey;
  private readonly _creatorId: GuidV4;
  private readonly _dateCreated: Date;
  private readonly _dateUpdated: Date;
  private _privateKey?: Buffer;
  private _votingPrivateKey?: PrivateKey;
  private _wallet?: Wallet;

  constructor(
    // Add injected services as parameters
    eciesService: ECIESService,
    votingService: VotingService,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
    publicKey: Buffer,
    votingPublicKey: PublicKey,
    privateKey?: Buffer,
    wallet?: Wallet,
    id?: GuidV4,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: GuidV4,
  ) {
    // Assign injected services
    this._eciesService = eciesService;
    this._votingService = votingService;
    // Assign original parameters
    this._type = type;
    this._id = id ?? GuidV4.new();
    this._name = name;
    if (!this._name || this._name.length == 0) {
      throw new MemberError(MemberErrorType.MissingMemberName);
    }
    if (this._name.trim() != this._name) {
      throw new MemberError(MemberErrorType.InvalidMemberNameWhitespace);
    }
    this._email = email;
    this._publicKey = publicKey;
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
    this._dateCreated = dateCreated ?? now();
    this._dateUpdated = dateUpdated ?? now();
    this._creatorId = creatorId ?? this._id;

    if (privateKey) {
      const { privateKey: _votingPrivateKey } =
        this._votingService.deriveVotingKeysFromECDH(privateKey, publicKey);
      this._votingPrivateKey = _votingPrivateKey;
    }
  }

  // Required getters
  public get id(): GuidV4 {
    return this._id;
  }
  public get type(): MemberType {
    return this._type;
  }
  public get name(): string {
    return this._name;
  }
  public get email(): EmailString {
    return this._email;
  }
  public get publicKey(): Buffer {
    return this._publicKey;
  }
  public get votingPublicKey(): PublicKey {
    return this._votingPublicKey;
  }
  public get creatorId(): GuidV4 {
    return this._creatorId;
  }
  public get dateCreated(): Date {
    return this._dateCreated;
  }
  public get dateUpdated(): Date {
    return this._dateUpdated;
  }

  // Optional private data getters
  public get privateKey(): Buffer | undefined {
    return this._privateKey;
  }
  public get votingPrivateKey(): PrivateKey | undefined {
    return this._votingPrivateKey;
  }
  public get wallet(): Wallet {
    if (!this._wallet) {
      throw new MemberError(MemberErrorType.NoWallet);
    }
    return this._wallet;
  }

  // State getters
  public get hasPrivateKey(): boolean {
    return this._privateKey !== undefined;
  }
  public get hasVotingPrivateKey(): boolean {
    return this._votingPrivateKey !== undefined;
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

  public loadWallet(mnemonic: SecureString): void {
    if (this._wallet) {
      throw new MemberError(MemberErrorType.WalletAlreadyLoaded);
    }
    const { wallet } = this._eciesService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKey = wallet.getPublicKey();
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      publicKey,
    ]);

    if (
      publicKeyWithPrefix.toString('hex') !== this._publicKey.toString('hex')
    ) {
      throw new MemberError(MemberErrorType.InvalidMnemonic);
    }
    this._wallet = wallet;
    this._privateKey = privateKey;
    this.deriveVotingKeyPair();
  }

  /**
   * Loads the private key and optionally the voting private key.
   *
   * @param privateKey The private key to load.
   * @param votingPrivateKey The voting private key to load.
   */
  public loadPrivateKey(
    privateKey: Buffer,
    votingPrivateKey?: IsolatedPrivateKey,
  ): void {
    this._privateKey = privateKey;
    if (votingPrivateKey) {
      this._votingPrivateKey = votingPrivateKey;
    }
  }

  public deriveVotingKeyPair(): void {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    const { privateKey: votingPrivateKey } =
      this._votingService.deriveVotingKeysFromECDH(
        this._privateKey,
        this._publicKey,
      );
    this._votingPrivateKey = votingPrivateKey;
  }

  public sign(data: Buffer): SignatureBuffer {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    return this._eciesService.signMessage(this._privateKey, data);
  }

  public verify(signature: SignatureBuffer, data: Buffer): boolean {
    return this._eciesService.verifyMessage(this._publicKey, data, signature);
  }

  public get votingKeyPair(): PaillierKeyPair {
    // Get raw public key (without 0x04 prefix)
    const rawPublicKey =
      this._publicKey[0] === ECIES.PUBLIC_KEY_MAGIC
        ? this._publicKey.subarray(1)
        : this._publicKey;

    // Derive voting keys from ECDH keys
    if (!this._privateKey) {
      throw new MemberError(
        MemberErrorType.PrivateKeyRequiredToDeriveVotingKeyPair,
      );
    }

    return this._votingService.deriveVotingKeysFromECDH(
      this._privateKey,
      rawPublicKey,
    );
  }

  private static readonly MAX_ENCRYPTION_SIZE = 1024 * 1024 * 10; // 10MB limit
  private static readonly VALID_STRING_REGEX = /^[\x20-\x7E\n\r\t]*$/; // Printable ASCII + common whitespace

  public encryptData(data: string | Buffer): Buffer {
    // Validate input
    if (!data) {
      throw new MemberError(MemberErrorType.MissingEncryptionData);
    }

    // For string input, validate content
    if (typeof data === 'string') {
      if (!BrightChainMember.VALID_STRING_REGEX.test(data)) {
        throw new MemberError(MemberErrorType.InvalidEncryptionData);
      }
    }

    // Check size limit
    const dataSize = Buffer.isBuffer(data)
      ? data.length
      : Buffer.byteLength(data);
    if (dataSize > BrightChainMember.MAX_ENCRYPTION_SIZE) {
      throw new MemberError(MemberErrorType.EncryptionDataTooLarge);
    }

    // Create buffer from validated data
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Use public key directly since it's already in ECDH format
    return this._eciesService.encrypt(this._publicKey, bufferData);
  }

  public decryptData(encryptedData: Buffer): Buffer {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    // decryptSingleWithHeader now returns the Buffer directly
    return this._eciesService.decryptSingleWithHeader(
      this._privateKey,
      encryptedData,
    );
  }

  public toJson(): string {
    const storage: IMemberStorageData = {
      id: this._id.toString(),
      type: this._type,
      name: this._name,
      email: this._email.toString(),
      publicKey: this._publicKey.toString('base64'),
      votingPublicKey: this._votingService
        .votingPublicKeyToBuffer(this._votingPublicKey)
        .toString('base64'),
      creatorId: this._creatorId.toString(),
      dateCreated: this._dateCreated.toISOString(),
      dateUpdated: this._dateUpdated.toISOString(),
    };
    return JSON.stringify(storage);
  }

  public static fromJson(
    json: string,
    // Add injected services as parameters
    eciesService: ECIESService,
    votingService: VotingService,
  ): BrightChainMember {
    const storage: IMemberStorageData = JSON.parse(json);
    const email = new EmailString(storage.email);
    // Removed: const votingService = ServiceProvider.getInstance().votingService;

    // Pass injected services to constructor
    return new BrightChainMember(
      eciesService,
      votingService,
      storage.type,
      storage.name,
      email,
      Buffer.from(storage.publicKey, 'base64'),
      votingService.bufferToVotingPublicKey(
        Buffer.from(storage.votingPublicKey, 'base64'),
      ),
      undefined,
      undefined,
      new GuidV4(storage.id),
      new Date(storage.dateCreated),
      new Date(storage.dateUpdated),
      new GuidV4(storage.creatorId),
    );
  }

  public static newMember(
    // Add injected services as parameters
    eciesService: ECIESService,
    votingService: VotingService,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
  ): { member: BrightChainMember; mnemonic: SecureString } {
    // Validate inputs first
    if (!name || name.length == 0) {
      throw new MemberError(MemberErrorType.MissingMemberName);
    }
    if (name.trim() != name) {
      throw new MemberError(MemberErrorType.InvalidMemberNameWhitespace);
    }
    if (!email || email.toString().length == 0) {
      throw new MemberError(MemberErrorType.MissingEmail);
    }
    if (email.toString().trim() != email.toString()) {
      throw new MemberError(MemberErrorType.InvalidEmailWhitespace);
    }

    // Use injected services
    // Removed: const eciesService = ServiceProvider.getInstance().eciesService;
    // Removed: const votingService = ServiceProvider.getInstance().votingService;
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
    const votingKeypair = votingService.deriveVotingKeysFromECDH(
      privateKey,
      publicKeyWithPrefix,
    );

    const newId = GuidV4.new();
    return {
      // Pass injected services to constructor
      member: new BrightChainMember(
        eciesService,
        votingService,
        type,
        name,
        email,
        publicKeyWithPrefix,
        votingKeypair.publicKey,
        privateKey,
        wallet,
        newId,
        undefined,
        undefined,
      ),
      mnemonic,
    };
  }
}
