import { NotImplementedError } from '../../errors/notImplemented';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { ChecksumUint8Array } from '../../types';
import { Document } from '../document';

/**
 * Base class for member documents
 */
export abstract class BaseMemberDocument {
  protected publicDocument: Document<IMemberStorageData>;
  protected privateDocument: Document<IMemberStorageData>;
  protected publicCBLId?: ChecksumUint8Array;
  protected privateCBLId?: ChecksumUint8Array;

  constructor(
    publicData: IMemberStorageData,
    privateData: IMemberStorageData,
    publicCBLId?: ChecksumUint8Array,
    privateCBLId?: ChecksumUint8Array,
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
   * Get public data
   */
  public get publicData(): IMemberStorageData {
    return JSON.parse(this.toPublicJson());
  }

  /**
   * Get private data
   */
  public get privateData(): IMemberStorageData {
    return JSON.parse(this.toPrivateJson());
  }

  /**
   * Get public CBL ID
   */
  public getPublicCBL(): ChecksumUint8Array {
    if (!this.publicCBLId) {
      throw new Error('Public CBL ID not set');
    }
    return this.publicCBLId;
  }

  /**
   * Get private CBL ID
   */
  public getPrivateCBL(): ChecksumUint8Array {
    if (!this.privateCBLId) {
      throw new Error('Private CBL ID not set');
    }
    return this.privateCBLId;
  }

  /**
   * Convert public data to CBL
   */
  public abstract toPublicCBL(): Promise<Buffer>;

  /**
   * Convert private data to CBL
   */
  public abstract toPrivateCBL(): Promise<Buffer>;

  /**
   * Create from CBLs
   */
  public static async createFromCBLs(
    publicCBL: Buffer,
    privateCBL: Buffer,
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
    return this.publicData.email;
  }

  public get dateCreated() {
    return new Date(this.publicData.dateCreated);
  }

  public get dateUpdated() {
    return new Date(this.publicData.dateUpdated);
  }

  public get publicKey() {
    return Buffer.from(this.publicData.publicKey, 'base64');
  }

  public get privateKey() {
    return undefined;
  }

  public get votingPublicKey() {
    return Buffer.from(this.publicData.votingPublicKey, 'base64');
  }

  public get votingPrivateKey() {
    return undefined;
  }

  public get creatorId() {
    return this.publicData.creatorId;
  }
}
