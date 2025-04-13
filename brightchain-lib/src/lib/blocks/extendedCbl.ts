import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { ExtendedCblError } from '../errors/extendedCblError';
import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { IEncryptedBlock } from '../interfaces/blocks/encrypted';
import { IExtendedConstituentBlockListBlock } from '../interfaces/blocks/extendedCbl';
import { ServiceLocator } from '../services/serviceLocator';
import {
  ChecksumString,
  ChecksumUint8Array,
  SignatureUint8Array,
} from '../types';

/**
 * Extended CBL class, which extends the CBL class with additional properties
 * for extended CBLs (fileName + mimeType).
 * This introduces a variable length header
 */
export class ExtendedCBL implements IExtendedConstituentBlockListBlock {
  // Delegate to the actual CBLBase instance
  private _delegate: any;

  constructor(...args: any[]) {
    // Dynamically load CBLBase to avoid circular dependency
    const { CBLBase } = require('./cblBase');
    // Create a new instance of CBLBase with the provided arguments
    this._delegate = new CBLBase(...args);
  }

  // Forward all properties and methods to the delegate
  protected get _data(): Buffer {
    return this._delegate._data;
  }

  protected ensureHeaderValidated(): void {
    this._delegate.ensureHeaderValidated();
    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * The name of the file represented by the CBL
   */
  public get fileName(): string {
    this.ensureHeaderValidated();
    const filename = ServiceLocator.getServiceProvider().cblService.getFileName(
      this._data,
    );
    ServiceLocator.getServiceProvider().cblService.validateFileNameFormat(
      filename,
    );
    return filename;
  }

  /**
   * The length of the file name
   */
  public get fileNameLength(): number {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getFileNameLength(
      this._data,
    );
  }

  /**
   * The MIME type of the file represented by the CBL
   */
  public get mimeType(): string {
    this.ensureHeaderValidated();
    const mimeType = ServiceLocator.getServiceProvider().cblService.getMimeType(
      this._data,
    );
    ServiceLocator.getServiceProvider().cblService.validateMimeTypeFormat(
      mimeType,
    );
    return mimeType;
  }

  /**
   * The length of the MIME type
   */
  public get mimeTypeLength(): number {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getMimeTypeLength(
      this._data,
    );
  }

  /**
   * Validate the CBL structure and metadata
   */
  public validateSync(): void {
    // Validate base CBL structure
    this._delegate.validateSync();

    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * Validate the CBL structure and metadata, async
   */
  public async validateAsync(): Promise<void> {
    // Validate base CBL structure
    await this._delegate.validateAsync();

    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  // Forward all other properties and methods to the delegate
  public get blockSize(): BlockSize {
    return this._delegate.blockSize;
  }

  public get blockType(): BlockType {
    return this._delegate.blockType;
  }

  public get isExtendedCbl(): boolean {
    return this._delegate.isExtendedCbl;
  }

  public get addressData(): Buffer {
    return this._delegate.addressData;
  }

  public get addresses(): ChecksumUint8Array[] {
    return this._delegate.addresses;
  }

  public get cblAddressCount(): number {
    return this._delegate.cblAddressCount;
  }

  public get dateCreated(): Date {
    return this._delegate.dateCreated;
  }

  public get originalDataLength(): number {
    return this._delegate.originalDataLength;
  }

  public get tupleSize(): number {
    return this._delegate.tupleSize;
  }

  public get creatorSignature(): SignatureUint8Array {
    return this._delegate.creatorSignature;
  }

  public get creatorId(): GuidV4 {
    return this._delegate.creatorId;
  }

  public get layerPayload(): Buffer {
    return this._delegate.layerPayload;
  }

  public get layerData(): Buffer {
    return this._delegate.layerData;
  }

  public get totalOverhead(): number {
    return this._delegate.totalOverhead;
  }

  public get layerHeaderData(): Buffer {
    return this._delegate.layerHeaderData;
  }

  public get fullHeaderData(): Buffer {
    return this._delegate.fullHeaderData;
  }

  public get data(): Buffer {
    // Ensure we return a Buffer, not a Readable
    const delegateData = this._delegate.data;
    if (Buffer.isBuffer(delegateData)) {
      return delegateData;
    }
    // If it's a Readable, convert it to a Buffer
    // This is a simplification - in a real implementation, you'd need to handle this properly
    return this._data;
  }

  public get idChecksum(): ChecksumUint8Array {
    return this._delegate.idChecksum;
  }

  public get checksumString(): ChecksumString {
    return this._delegate.checksumString;
  }

  public get canRead(): boolean {
    return this._delegate.canRead;
  }

  public get canPersist(): boolean {
    return this._delegate.canPersist;
  }

  public get blockDataType(): BlockDataType {
    return this._delegate.blockDataType;
  }

  public get creator(): BrightChainMember {
    return this._delegate.creator;
  }

  public get headerValidated(): boolean {
    return this._delegate.headerValidated;
  }

  public get layerOverheadSize(): number {
    return this._delegate.layerOverhead;
  }

  public get lengthBeforeEncryption(): number {
    return this._delegate.lengthBeforeEncryption;
  }

  public get layerPayloadSize(): number {
    return this._delegate.payloadLength;
  }

  public get layers(): any[] {
    return this._delegate.layers;
  }

  public get parent(): any {
    return this._delegate.parent;
  }

  public canEncrypt(): boolean {
    return this._delegate.canEncrypt;
  }

  public canMultiEncrypt(recipientCount: number): boolean {
    return this._delegate.canMultiEncrypt(recipientCount);
  }

  public validateSignature(creator?: BrightChainMember): boolean {
    return this._delegate.validateSignature(creator);
  }

  public validate(): void {
    this._delegate.validate();
  }

  public async encrypt<E extends IEncryptedBlock>(
    newBlockType: BlockType,
  ): Promise<E> {
    return this._delegate.encrypt(newBlockType);
  }

  public async getHandleTuples(getDiskBlockPath: any): Promise<any[]> {
    return this._delegate.getHandleTuples(getDiskBlockPath);
  }
}
