import {
  constants,
  EmailString,
  GuidV4,
  IMemberStorageData,
  MemberError,
  MemberErrorType,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@brightchain/brightchain-lib';
import { Wallet } from '@ethereumjs/wallet';

import { ECIESService } from './services/ecies/service';
// Removed: import { ServiceProvider } from './services/service.provider';
import { IBurnbagMemberOperational } from './interfaces/member/operational';
import { DefaultBackendIdType, SignatureBuffer } from './shared-types';

/**
 * A member of Brightchain.
 * In the Owner Free Filesystem (OFF), members are used to:
 * 1. Sign and verify data
 * 2. Encrypt and decrypt data
 * 3. Participate in voting
 * 4. Establish ownership of data
 */
export class BrightChainMember
  implements IBurnbagMemberOperational<DefaultBackendIdType>
{
  private readonly _eciesService: ECIESService;
  private readonly _id: GuidV4;
  private readonly _type: MemberType;
  private readonly _name: string;
  private readonly _email: EmailString;
  private readonly _publicKey: Buffer;
  private readonly _creatorId: GuidV4;
  private readonly _dateCreated: Date;
  private readonly _dateUpdated: Date;
  private _privateKey?: SecureBuffer;
  private _wallet?: Wallet;

  constructor(
    // Add injected services as parameters
    eciesService: ECIESService,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
    publicKey: Buffer,
    privateKey?: SecureBuffer,
    wallet?: Wallet,
    id?: DefaultBackendIdType,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: DefaultBackendIdType,
  ) {
    // Assign injected services
    this._eciesService = eciesService;
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
  }

  // Required getters
  public get id(): DefaultBackendIdType {
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
  public get creatorId(): DefaultBackendIdType {
    return this._creatorId;
  }
  public get dateCreated(): Date {
    return this._dateCreated;
  }
  public get dateUpdated(): Date {
    return this._dateUpdated;
  }

  // Optional private data getters
  public get privateKey(): SecureBuffer | undefined {
    return this._privateKey;
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

  public unloadPrivateKey(): void {
    // Do not dispose here; tests expect the same SecureBuffer instance to remain usable
    // when reloaded into another member in the same process.
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
      Buffer.from([constants.ECIES.PUBLIC_KEY_MAGIC]),
      publicKey,
    ]);

    if (
      publicKeyWithPrefix.toString('hex') !== this._publicKey.toString('hex')
    ) {
      throw new MemberError(MemberErrorType.InvalidMnemonic);
    }
    this._wallet = wallet;
    this._privateKey = new SecureBuffer(privateKey);
  }

  /**
   * Loads the private key and optionally the voting private key.
   *
   * @param privateKey The private key to load.
   * @param votingPrivateKey The voting private key to load.
   */
  public loadPrivateKey(privateKey: SecureBuffer): void {
    this._privateKey = privateKey;
  }

  public sign(data: Buffer): SignatureBuffer {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    return this._eciesService.signMessage(
      Buffer.from(this._privateKey.value),
      data,
    );
  }

  public signData(data: Buffer): SignatureBuffer {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    return this._eciesService.signMessage(
      Buffer.from(this._privateKey.value),
      data,
    );
  }

  public verify(signature: SignatureBuffer, data: Buffer): boolean {
    return this._eciesService.verifyMessage(this._publicKey, data, signature);
  }

  public verifySignature(
    data: Buffer,
    signature: Buffer,
    publicKey: Buffer,
  ): boolean {
    return this._eciesService.verifyMessage(
      publicKey,
      data,
      signature as SignatureBuffer,
    );
  }

  private static readonly MAX_ENCRYPTION_SIZE = 1024 * 1024 * 10; // 10MB limit
  private static readonly VALID_STRING_REGEX = /^[\x20-\x7E\n\r\t]*$/; // Printable ASCII + common whitespace

  public encryptData(
    data: string | Buffer,
    recipientPublicKey?: Buffer,
  ): Buffer {
    // Validate input
    if (!data) {
      throw new MemberError(MemberErrorType.MissingEncryptionData);
    }

    // Check size limit
    const dataSize = Buffer.isBuffer(data)
      ? data.length
      : Buffer.byteLength(data);
    if (dataSize > BrightChainMember.MAX_ENCRYPTION_SIZE) {
      throw new MemberError(MemberErrorType.EncryptionDataTooLarge);
    }

    // Create buffer from data
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Use recipient public key or self public key
    const targetPublicKey = recipientPublicKey || this._publicKey;

    return this._eciesService.encryptSimpleOrSingle(
      false,
      targetPublicKey,
      bufferData,
    );
  }

  public decryptData(encryptedData: Buffer): Buffer {
    if (!this._privateKey) {
      throw new MemberError(MemberErrorType.MissingPrivateKey);
    }
    // decryptSingleWithHeader now returns the Buffer directly
    return this._eciesService.decryptSimpleOrSingleWithHeader(
      false,
      Buffer.from(this._privateKey.value),
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
      creatorId: this._creatorId.toString(),
      dateCreated: this._dateCreated.toISOString(),
      dateUpdated: this._dateUpdated.toISOString(),
    };
    return JSON.stringify(storage);
  }

  public dispose(): void {
    // Ensure secret material is zeroized when disposing
    try {
      this._privateKey?.dispose();
    } finally {
      this.unloadWalletAndPrivateKey();
    }
  }

  public static fromJson(
    json: string,
    // Add injected services as parameters
    eciesService: ECIESService,
  ): BrightChainMember {
    const storage: IMemberStorageData = JSON.parse(json);
    const email = new EmailString(storage.email);

    // Pass injected services to constructor
    const dateCreated = new Date(storage.dateCreated);
    return new BrightChainMember(
      eciesService,
      storage.type,
      storage.name,
      email,
      Buffer.from(storage.publicKey, 'base64'),
      undefined,
      undefined,
      new GuidV4(storage.id),
      dateCreated,
      new Date(storage.dateUpdated),
      new GuidV4(storage.creatorId),
    );
  }

  public static fromMnemonic(
    mnemonic: SecureString,
    eciesService: ECIESService,
  ): BrightChainMember {
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([constants.ECIES.PUBLIC_KEY_MAGIC]),
      wallet.getPublicKey(),
    ]);

    return new BrightChainMember(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
      publicKeyWithPrefix,
      new SecureBuffer(privateKey),
      wallet,
    );
  }

  public static newMember(
    // Add injected services as parameters
    eciesService: ECIESService,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
    forceMnemonic?: SecureString,
    createdBy?: DefaultBackendIdType,
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
    const mnemonic = forceMnemonic ?? eciesService.generateNewMnemonic();
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

    // Get private key from wallet
    const privateKey = wallet.getPrivateKey();
    // Get public key with 0x04 prefix
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([constants.ECIES.PUBLIC_KEY_MAGIC]),
      wallet.getPublicKey(),
    ]);

    const newId = GuidV4.new();
    const dateCreated = new Date();
    return {
      // Pass injected services to constructor
      member: new BrightChainMember(
        eciesService,
        type,
        name,
        email,
        publicKeyWithPrefix,
        new SecureBuffer(privateKey),
        wallet,
        newId,
        dateCreated,
        dateCreated,
        createdBy ?? newId,
      ),
      mnemonic,
    };
  }
}
