import { EmailString } from '@digitaldefiance/ecies-lib';
import { base64ToUint8Array } from '../../bufferUtils';
import { BrightChainStrings } from '../../enumerations';
import { NotImplementedError } from '../../errors/notImplemented';
import { TranslatableBrightChainError } from '../../errors/translatableBrightChainError';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { Checksum } from '../../types/checksum';
import { Document } from '../base/document';

/**
 * Base class for member documents
 */
export abstract class BaseMemberDocument {
  protected publicDocument: Document<IMemberStorageData>;
  protected privateDocument: Document<IMemberStorageData>;
  protected publicCBLId?: Checksum;
  protected privateCBLId?: Checksum;

  constructor(
    publicData: IMemberStorageData,
    privateData: IMemberStorageData,
    publicCBLId?: Checksum,
    privateCBLId?: Checksum,
  ) {
    this.publicDocument = new Document<IMemberStorageData>(publicData);
    this.privateDocument = new Document<IMemberStorageData>(privateData);
    this.publicCBLId = publicCBLId;
    this.privateCBLId = privateCBLId;
  }

  /**
   * Convert public data to JSON
   */
  public toPublicJson(): string {
    return this.publicDocument.toJson();
  }

  /**
   * Convert private data to JSON
   */
  public toPrivateJson(): string {
    return this.privateDocument.toJson();
  }

  /**
   * Convert document to JSON (public data by default)
   */
  public toJson(): string {
    return this.toPublicJson();
  }

  /**
   * Get public data
   */
  public get publicData(): IMemberStorageData {
    return this.publicDocument.getData();
  }

  /**
   * Get private data
   */
  public get privateData(): IMemberStorageData {
    return this.privateDocument.getData();
  }

  /**
   * Get public CBL ID
   */
  public getPublicCBL(): Checksum {
    if (!this.publicCBLId) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet,
      );
    }
    return this.publicCBLId;
  }

  /**
   * Get private CBL ID
   */
  public getPrivateCBL(): Checksum {
    if (!this.privateCBLId) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet,
      );
    }
    return this.privateCBLId;
  }

  /**
   * Convert public data to CBL
   */
  public abstract toPublicCBL(): Promise<Uint8Array>;

  /**
   * Convert private data to CBL
   */
  public abstract toPrivateCBL(): Promise<Uint8Array>;

  /**
   * Create from CBLs
   */
  public static async createFromCBLs(
    _publicCBL: Uint8Array,
    _privateCBL: Uint8Array,
  ): Promise<BaseMemberDocument> {
    throw new NotImplementedError();
  }

  // Convenience getters for common fields
  public get id() {
    return this.publicData.id;
  }

  public get type() {
    return this.publicData.type;
  }

  public get name() {
    return this.publicData.name;
  }

  public get email() {
    return new EmailString(this.publicData.email);
  }

  public get contactEmail() {
    return this.privateData.email;
  }

  public get dateCreated() {
    return new Date(this.publicData.dateCreated);
  }

  public get dateUpdated() {
    return new Date(this.publicData.dateUpdated);
  }

  public get publicKey() {
    return base64ToUint8Array(this.publicData.publicKey);
  }

  public get privateKey() {
    return undefined;
  }

  public get votingPublicKey() {
    return base64ToUint8Array(this.publicData.votingPublicKey);
  }

  public get votingPrivateKey() {
    return undefined;
  }

  public get creatorId() {
    return this.publicData.creatorId;
  }
}
