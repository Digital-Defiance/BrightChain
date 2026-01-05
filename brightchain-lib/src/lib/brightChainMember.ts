import {
  EmailString as EciesEmailString,
  MemberType as EciesMemberType,
  SecureBuffer as EciesSecureBuffer,
  SecureString as EciesSecureString,
  EmailString,
  GuidV4,
} from '@digitaldefiance/ecies-lib';
import { ECIESService, Member } from '@digitaldefiance/node-ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import {
  KeyPair as PaillierKeyPair,
  PublicKey,
  generateRandomKeysSync,
} from 'paillier-bigint';
import { ECIES } from './constants';
import { MemberErrorType } from './enumerations/memberErrorType';
import { MemberType } from './enumerations/memberType';
import { MemberError } from './errors/memberError';
import { IBrightChainMemberOperational } from './interfaces/member/operational';
import { IMemberStorageData } from './interfaces/member/storage';
import { ServiceProvider } from './services/service.provider';

/**
 * A member of Brightchain.
 * In the Owner Free Filesystem (OFF), members are used to:
 * 1. Sign and verify blocks
 * 2. Encrypt and decrypt data
 * 3. Participate in voting
 * 4. Establish ownership of blocks
 *
 * Extends the ECIES-lib Member class and adds BrightChain-specific voting functionality.
 * Uses Buffer as the ID type (compatible with GuidV4's internal representation).
 */
export class BrightChainMember
  extends Member<Buffer>
  implements IBrightChainMemberOperational
{
  private _votingPublicKeyLoaded: PublicKey;
  private _guidId: GuidV4;
  private _guidCreatorId: GuidV4;

  private constructor(
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
    const eciesService = ServiceProvider.getInstance().eciesService;

    // Store GuidV4 instances
    const guidId = id || GuidV4.new();
    const guidCreatorId = creatorId || guidId;

    // Call parent constructor with Buffer IDs (GuidV4's internal representation)
    super(
      eciesService,
      type as unknown as EciesMemberType,
      name,
      email as unknown as EciesEmailString,
      publicKey,
      privateKey
        ? new EciesSecureBuffer(new Uint8Array(privateKey))
        : undefined,
      wallet,
      Buffer.from(guidId.asRawGuidBuffer),
      dateCreated,
      dateUpdated,
      Buffer.from(guidCreatorId.asRawGuidBuffer),
    );

    // Store GuidV4 instances for BrightChain compatibility
    this._guidId = guidId;
    this._guidCreatorId = guidCreatorId;
    this._votingPublicKeyLoaded = votingPublicKey;

    // Load the voting public key
    this.loadVotingKeys(votingPublicKey);
  }

  /**
   * Static factory method to create a BrightChainMember asynchronously
   */
  public static async create(
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
  ): Promise<BrightChainMember> {
    const member = new BrightChainMember(
      type,
      name,
      email,
      publicKey,
      votingPublicKey,
      privateKey,
      wallet,
      id,
      dateCreated,
      dateUpdated,
      creatorId,
    );

    // If privateKey is provided, derive voting private key
    if (privateKey) {
      await member.deriveVotingKeys();
    }

    return member;
  }

  // BrightChain-specific voting getters - delegate to parent
  public override get votingPublicKey(): PublicKey {
    if (!super.votingPublicKey && !this._votingPublicKeyLoaded) {
      throw new MemberError(MemberErrorType.MissingVotingPublicKey);
    }
    return super.votingPublicKey ?? this._votingPublicKeyLoaded;
  }

  // Guid accessors for BrightChain compatibility
  public get guidId(): GuidV4 {
    return this._guidId;
  }

  public get guidCreatorId(): GuidV4 {
    return this._guidCreatorId;
  }

  public override get hasVotingPrivateKey(): boolean {
    return super.hasVotingPrivateKey;
  }

  // Override loadWallet to also derive voting keys
  public override loadWallet(mnemonic: EciesSecureString): void {
    // Call parent's loadWallet which validates and loads the wallet
    super.loadWallet(mnemonic);

    // Note: Caller should await deriveVotingKeys() after this if needed
  }

  /**
   * Loads the private key.
   *
   * @param privateKey The private key to load.
   */
  public override loadPrivateKey(privateKey: EciesSecureBuffer): void {
    super.loadPrivateKey(privateKey);
    // Note: Caller should await deriveVotingKeys() after this if needed
  }

  /**
   * Derive voting keys using parent's implementation
   * @deprecated Use parent's deriveVotingKeys() directly
   */
  public async deriveVotingKeyPair(): Promise<void> {
    await super.deriveVotingKeys();
  }

  /**
   * Wrapper for parent's async deriveVotingKeys method
   */
  public override async deriveVotingKeys(): Promise<void> {
    await super.deriveVotingKeys();
  }

  // Note: sign and verify are inherited from parent Member class
  // Parent signature: sign(data: Buffer): SignatureBuffer
  // Parent signature: verify(signature: SignatureBuffer, data: Buffer): boolean

  public get votingKeyPair(): PaillierKeyPair {
    if (!this.votingPublicKey || !this.votingPrivateKey) {
      throw new MemberError(
        MemberErrorType.PrivateKeyRequiredToDeriveVotingKeyPair,
      );
    }

    return {
      publicKey: this.votingPublicKey,
      privateKey: this.votingPrivateKey,
    };
  }

  // Delegate to parent's encryptData and decryptData methods
  // These are already implemented in the Member base class

  // Delegate to parent's encryptData and decryptData methods
  // These are already implemented in the Member base class

  public override toJson(): string {
    const publicKeyUint8 = super.publicKey as Uint8Array;
    const storage: IMemberStorageData = {
      id: this.guidId.toString(),
      type: this.type,
      name: this.name,
      email: this.email.toString(),
      publicKey: Buffer.from(publicKeyUint8).toString('base64'),
      // Serialize voting public key (n value as hex string)
      votingPublicKey: this.votingPublicKey
        ? this.votingPublicKey.n.toString(16)
        : '',
      creatorId: this.guidCreatorId.toString(),
      dateCreated: this.dateCreated.toISOString(),
      dateUpdated: this.dateUpdated.toISOString(),
    };
    return JSON.stringify(storage);
  }

  public static override fromJson(json: string): BrightChainMember {
    const storage: IMemberStorageData = JSON.parse(json);
    const email = new EmailString(storage.email);

    // Import PublicKey from paillier-bigint to reconstruct voting key
    const votingPublicKey = new PublicKey(
      BigInt('0x' + storage.votingPublicKey),
      BigInt('0x' + storage.votingPublicKey) + 1n, // g = n + 1 for Paillier
    );

    // Use synchronous constructor directly
    return new BrightChainMember(
      storage.type,
      storage.name,
      email,
      Buffer.from(storage.publicKey, 'base64'),
      votingPublicKey,
      undefined,
      undefined,
      new GuidV4(storage.id),
      new Date(storage.dateCreated),
      new Date(storage.dateUpdated),
      new GuidV4(storage.creatorId),
    );
  }

  public static override newMember(
    eciesService: ECIESService,
    type: MemberType,
    name: string,
    email: EmailString,
    forceMnemonic?: EciesSecureString,
    createdBy?: Buffer,
  ): { member: BrightChainMember; mnemonic: EciesSecureString } {
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

    const _votingService = ServiceProvider.getInstance().votingService;
    const mnemonic = forceMnemonic || eciesService.generateNewMnemonic();
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

    // Get private key from wallet
    const privateKey = wallet.getPrivateKey();
    // Get public key with 0x04 prefix
    const publicKeyWithPrefix = Buffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      wallet.getPublicKey(),
    ]);

    // Derive voting keys synchronously using a simple approach
    // Note: For production, you may want to use the async deriveVotingKeys method after creation
    const votingKeypair = generateRandomKeysSync(2048);

    const newId = createdBy ? new GuidV4(createdBy) : GuidV4.new();
    const member = new BrightChainMember(
      type,
      name,
      email,
      publicKeyWithPrefix,
      votingKeypair.publicKey,
      Buffer.from(privateKey),
      wallet,
      newId,
      undefined,
      undefined,
    );

    return {
      member,
      mnemonic,
    };
  }
}
