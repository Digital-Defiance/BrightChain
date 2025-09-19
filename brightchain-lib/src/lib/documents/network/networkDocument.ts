import { BrightChainMember } from '../../brightChainMember';
import { GuidV4 } from '../../guid';
import { ChecksumUint8Array, SignatureUint8Array } from '../../types';

/**
 * Base interface for all network-related documents
 */
export interface NetworkDocument {
  // Identity
  id: GuidV4;
  type: 'NODE' | 'PEER' | 'BLOCK_INDEX' | 'METADATA';
  version: number;

  // Timestamps
  created: Date;
  updated: Date;

  // Security
  creator: BrightChainMember;
  signature: SignatureUint8Array;
  checksum: ChecksumUint8Array;

  // Network
  ttl?: number; // Time-to-live in seconds
  replicationFactor?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

  // Metadata
  tags?: string[];
  references?: GuidV4[]; // Related document IDs
}

/**
 * Base class for network documents that will be stored in CBLs
 */
export abstract class BaseNetworkDocument implements NetworkDocument {
  id: GuidV4;
  type: 'NODE' | 'PEER' | 'BLOCK_INDEX' | 'METADATA';
  version: number;
  created: Date;
  updated: Date;
  creator: BrightChainMember;
  signature: SignatureUint8Array;
  checksum: ChecksumUint8Array;
  ttl?: number;
  replicationFactor?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  tags?: string[];
  references?: GuidV4[];

  constructor(
    type: 'NODE' | 'PEER' | 'BLOCK_INDEX' | 'METADATA',
    creator: BrightChainMember,
    options: {
      id?: GuidV4;
      version?: number;
      ttl?: number;
      replicationFactor?: number;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
      tags?: string[];
      references?: GuidV4[];
    } = {},
  ) {
    this.type = type;
    this.creator = creator;
    this.id = options.id || GuidV4.new();
    this.version = options.version || 1;
    this.created = new Date();
    this.updated = new Date();
    this.ttl = options.ttl;
    this.replicationFactor = options.replicationFactor;
    this.priority = options.priority || 'NORMAL';
    this.tags = options.tags || [];
    this.references = options.references || [];

    // Signature and checksum will be set when the document is finalized
    this.signature = Buffer.alloc(0) as SignatureUint8Array;
    this.checksum = Buffer.alloc(0) as ChecksumUint8Array;
  }

  /**
   * Sign the document with the creator's key
   */
  async sign(): Promise<void> {
    // Create a buffer of all fields except signature and checksum
    const dataToSign = Buffer.concat([
      this.id.asRawGuidArray,
      Buffer.from(this.type),
      Buffer.from(this.version.toString()),
      Buffer.from(this.created.toISOString()),
      Buffer.from(this.updated.toISOString()),
      this.creator.publicKey,
      // Add other fields...
    ]);

    // Sign with creator's key
    this.signature = this.creator.sign(dataToSign);
  }

  /**
   * Verify the document's signature
   */
  async verify(): Promise<boolean> {
    // Recreate the signed data buffer
    const dataToVerify = Buffer.concat([
      this.id.asRawGuidArray,
      Buffer.from(this.type),
      Buffer.from(this.version.toString()),
      Buffer.from(this.created.toISOString()),
      Buffer.from(this.updated.toISOString()),
      this.creator.publicKey,
      // Add other fields...
    ]);

    // Verify with creator's public key
    return this.creator.verify(this.signature, dataToVerify);
  }

  /**
   * Convert to CBL-compatible format
   * This will be implemented by derived classes
   */
  abstract toCBL(): Promise<Buffer>;

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
    this.signature = Buffer.alloc(0) as SignatureUint8Array;
    this.checksum = Buffer.alloc(0) as ChecksumUint8Array;
  }
}
