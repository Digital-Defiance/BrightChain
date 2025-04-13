import {
  ChecksumUint8Array,
  getEnhancedIdProvider,
  Guid,
  Member,
  PlatformID,
  SignatureUint8Array,
  stringToUint8Array,
} from '@digitaldefiance/ecies-lib';

/**
 * Base interface for all network-related documents
 */
export interface NetworkDocument<TID extends PlatformID = Uint8Array> {
  // Identity
  id: TID;
  type: 'NODE' | 'PEER' | 'BLOCK_INDEX' | 'METADATA';
  version: number;

  // Timestamps
  created: Date;
  updated: Date;

  // Security
  creator: Member;
  signature: SignatureUint8Array;
  checksum: ChecksumUint8Array;

  // Network
  ttl?: number; // Time-to-live in seconds
  replicationFactor?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

  // Metadata
  tags?: string[];
  references?: Guid[]; // Related document IDs
}

/**
 * Base class for network documents that will be stored in CBLs
 */
export abstract class BaseNetworkDocument<
  TID extends PlatformID = Uint8Array,
> implements NetworkDocument<TID> {
  id: TID;
  type: 'NODE' | 'PEER' | 'BLOCK_INDEX' | 'METADATA';
  version: number;
  created: Date;
  updated: Date;
  creator: Member;
  signature: SignatureUint8Array;
  checksum: ChecksumUint8Array;
  ttl?: number;
  replicationFactor?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  tags?: string[];
  references?: Guid[];

  constructor(
    type: 'NODE' | 'PEER' | 'BLOCK_INDEX' | 'METADATA',
    creator: Member,
    options: {
      id?: TID;
      version?: number;
      ttl?: number;
      replicationFactor?: number;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
      tags?: string[];
      references?: Guid[];
    } = {},
  ) {
    this.type = type;
    this.creator = creator;
    this.id = options.id || getEnhancedIdProvider<TID>().generateTyped();
    this.version = options.version || 1;
    this.created = new Date();
    this.updated = new Date();
    this.ttl = options.ttl;
    this.replicationFactor = options.replicationFactor;
    this.priority = options.priority || 'NORMAL';
    this.tags = options.tags || [];
    this.references = options.references || [];

    // Signature and checksum will be set when the document is finalized
    this.signature = new Uint8Array() as unknown as SignatureUint8Array;
    this.checksum = new Uint8Array() as unknown as ChecksumUint8Array;
  }

  /**
   * Sign the document with the creator's key
   */
  async sign(): Promise<void> {
    // Create a buffer of all fields except signature and checksum
    const dataToSign = Buffer.concat([
      getEnhancedIdProvider<TID>().toBytes(this.id),
      stringToUint8Array(this.type),
      stringToUint8Array(this.version.toString()),
      stringToUint8Array(this.created.toISOString()),
      stringToUint8Array(this.updated.toISOString()),
      this.creator.publicKey,
      // Add other fields...
    ]);

    // Sign with creator's key - convert to Uint8Array for interface compatibility
    const signatureBuffer = this.creator.sign(dataToSign);
    this.signature = new Uint8Array(
      signatureBuffer,
    ) as unknown as SignatureUint8Array;
  }

  /**
   * Verify the document's signature
   */
  async verify(): Promise<boolean> {
    // Recreate the signed data buffer
    const dataToVerify = Buffer.concat([
      getEnhancedIdProvider<TID>().toBytes(this.id),
      stringToUint8Array(this.type),
      stringToUint8Array(this.version.toString()),
      stringToUint8Array(this.created.toISOString()),
      stringToUint8Array(this.updated.toISOString()),
      this.creator.publicKey,
      // Add other fields...
    ]);

    return this.creator.verify(this.signature, dataToVerify);
  }

  /**
   * Convert to CBL-compatible format
   * This will be implemented by derived classes
   */
  abstract toCBL(): Promise<Uint8Array>;

  /**
   * Create from CBL data
   * This will be implemented by derived classes
   */
  abstract fromCBL(data: Buffer): Promise<BaseNetworkDocument>;

  /**
   * Update the document
   * This will update the 'updated' timestamp and increment version
   */
  protected update(): void {
    this.updated = new Date();
    this.version++;
    // Clear signature and checksum as they need to be recalculated
    this.signature = new Uint8Array() as SignatureUint8Array;
    this.checksum = new Uint8Array() as ChecksumUint8Array;
  }
}
