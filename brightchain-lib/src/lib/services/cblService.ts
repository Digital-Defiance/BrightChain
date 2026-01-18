import {
  ECIESService,
  getEnhancedIdProvider,
  Member,
  PlatformID,
  SignatureUint8Array,
  TypedIdProviderWrapper,
} from '@digitaldefiance/ecies-lib';
import { concatenateUint8Arrays, writeUInt32BE } from '../bufferUtils';
import CONSTANTS, { CBL, CHECKSUM, ECIES, TUPLE } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { CblErrorType } from '../enumerations/cblErrorType';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { CblError } from '../errors/cblError';
import { ExtendedCblError } from '../errors/extendedCblError';
import { IConstituentBlockListBlockHeader } from '../interfaces/blocks/headers/cblHeader';
import { IExtendedConstituentBlockListBlockHeader } from '../interfaces/blocks/headers/ecblHeader';
import { Checksum } from '../types/checksum';
import { Validator } from '../utils/validator';
import { BlockCapacityCalculator } from './blockCapacity.service';
import { ChecksumService } from './checksum.service';

/**
 * Service for creating and verifying CBL blocks.
 *
 * This service provides functionality for:
 * - Creating CBL headers with proper validation
 * - Parsing CBL headers from data
 * - Validating file names and MIME types
 * - Calculating CBL address capacity
 *
 * @remarks
 * - All methods validate inputs before processing
 * - Errors are wrapped in CblError or ExtendedCblError with appropriate context
 * - The service supports both standard and extended CBL blocks
 *
 * @see Requirements 5.1, 5.2, 5.3, 12.1, 12.2, 12.7
 */
export class CBLService<TID extends PlatformID = Uint8Array> {
  private readonly checksumService: ChecksumService;
  private readonly eciesService: ECIESService<TID>;
  private readonly enhancedProvider: TypedIdProviderWrapper<TID>;

  /**
   * Get the enhanced ID provider for this service
   */
  public get idProvider(): TypedIdProviderWrapper<TID> {
    return this.enhancedProvider;
  }
  constructor(
    checksumService: ChecksumService,
    eciesService: ECIESService<TID>,
    enhancedProvider?: TypedIdProviderWrapper<TID>,
  ) {
    this.checksumService = checksumService;
    this.eciesService = eciesService;
    // Use the enhanced provider which should now use the same global configuration
    this.enhancedProvider = enhancedProvider ?? getEnhancedIdProvider<TID>();
  }

  /** Create safe buffers for common operations */
  private createArrays() {
    return {
      dateCreated: new Uint8Array(CONSTANTS['UINT32_SIZE'] * 2),
      addressCount: new Uint8Array(CONSTANTS['UINT32_SIZE']),
      tupleSize: new Uint8Array(CONSTANTS['UINT8_SIZE']),
      dataLength: new Uint8Array(CONSTANTS['UINT64_SIZE']),
      dataChecksum: new Uint8Array(CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH),
      blockSize: new Uint8Array(CONSTANTS['UINT32_SIZE']),
      fileNameLength: new Uint8Array(CONSTANTS['UINT16_SIZE']),
      mimeTypeLength: new Uint8Array(CONSTANTS['UINT8_SIZE']),
    };
  }

  /**
   * Length of the creator field in the header (dynamic based on provider)
   */
  public get creatorLength(): number {
    return this.enhancedProvider.byteLength;
  }

  /**
   * Length of the date field in the header
   * Date consists of two 32-bit unsigned integers (high/low)
   */
  public static readonly DateSize: number = CONSTANTS['UINT32_SIZE'] * 2;

  /**
   * Length of the address count field in the header
   */
  public static readonly AddressCountSize: number = CONSTANTS['UINT32_SIZE'];

  /**
   * Length of the tuple size field in the header
   */
  public static readonly TupleSizeSize: number = CONSTANTS['UINT8_SIZE'];

  /**
   * Length of the original data length field in the header
   */
  public static readonly DataLengthSize: number = CONSTANTS['UINT64_SIZE'];

  /**
   * Length of the data checksum field in the header
   */
  public static readonly DataChecksumSize: number =
    CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH;

  /**
   * Length of the is extended header field in the header
   */
  public static readonly IsExtendedHeaderSize: number = CONSTANTS['UINT8_SIZE'];

  /**
   * Length of the creator signature field in the header
   */
  public static readonly CreatorSignatureSize: number = ECIES.SIGNATURE_LENGTH;

  /**
   * Length of the creator ID field (GUID size) - static default for backward compatibility
   * @deprecated Use instance method creatorLength instead for dynamic provider support
   */
  public static readonly CreatorIdLength: number =
    CONSTANTS['ENCRYPTION'].RECIPIENT_ID_SIZE;

  /**
   * Offset of the date field in the header (instance method for dynamic provider support)
   */
  public get dateCreatedOffset(): number {
    return this.creatorLength;
  }

  /**
   * Offset of the date field in the header (static for backward compatibility)
   * @deprecated Use instance method dateCreatedOffset instead
   */
  public static get DateCreatedOffset(): number {
    return CBLService.CreatorIdLength;
  }

  /**
   * Offset of the address count field in the header (instance method)
   */
  public get cblAddressCountOffset(): number {
    return this.dateCreatedOffset + CBLService.DateSize;
  }

  /**
   * Offset of the address count field in the header (static for backward compatibility)
   * @deprecated Use instance method cblAddressCountOffset instead
   */
  public static get CblAddressCountOffset(): number {
    return CBLService.DateCreatedOffset + CBLService.DateSize;
  }

  /**
   * Offset of the tuple size field in the header (instance method)
   */
  public get tupleSizeOffset(): number {
    return this.cblAddressCountOffset + CBLService.AddressCountSize;
  }

  /**
   * Offset of the tuple size field in the header (static for backward compatibility)
   * @deprecated Use instance method tupleSizeOffset instead
   */
  public static get TupleSizeOffset(): number {
    return CBLService.CblAddressCountOffset + CBLService.AddressCountSize;
  }

  /**
   * Offset of the original data length field in the header (instance method)
   */
  public get originalDataLengthOffset(): number {
    return this.tupleSizeOffset + CBLService.TupleSizeSize;
  }

  /**
   * Offset of the original data length field in the header (static for backward compatibility)
   * @deprecated Use instance method originalDataLengthOffset instead
   */
  public static get OriginalDataLengthOffset(): number {
    return CBLService.TupleSizeOffset + CBLService.TupleSizeSize;
  }

  /**
   * Offset of the original checksum field in the header (instance method)
   */
  public get originalChecksumOffset(): number {
    return this.originalDataLengthOffset + CBLService.DataLengthSize;
  }

  /**
   * Static offset for backward compatibility
   * @deprecated Use instance method originalChecksumOffset instead
   */
  public static get OriginalChecksumOffset(): number {
    return CBLService.OriginalDataLengthOffset + CBLService.DataLengthSize;
  }

  /**
   * Offset of the is extended header field in the header (instance method)
   */
  public get isExtendedHeaderOffset(): number {
    return this.originalChecksumOffset + CBLService.DataChecksumSize;
  }

  /**
   * Offset of the is extended header field in the header (static for backward compatibility)
   * @deprecated Use instance method isExtendedHeaderOffset instead
   */
  public static get IsExtendedHeaderOffset(): number {
    return CBLService.OriginalChecksumOffset + CBLService.DataChecksumSize;
  }

  /**
   * Offset of the creator signature field in the header (instance method)
   */
  public get baseHeaderCreatorSignatureOffset(): number {
    return this.isExtendedHeaderOffset + CBLService.IsExtendedHeaderSize;
  }

  /**
   * Offset of the creator signature field in the header (static for backward compatibility)
   * @deprecated Use instance method baseHeaderCreatorSignatureOffset instead
   */
  public static get BaseHeaderCreatorSignatureOffset(): number {
    return CBLService.IsExtendedHeaderOffset + CBLService.IsExtendedHeaderSize;
  }

  /**
   * Length of the base header with signature (instance method)
   */
  public get baseHeaderSize(): number {
    return (
      this.baseHeaderCreatorSignatureOffset + CBLService.CreatorSignatureSize
    );
  }

  /**
   * Length of the base header with signature (static for backward compatibility)
   * @deprecated Use instance method baseHeaderSize instead
   */
  public static get BaseHeaderSize(): number {
    return (
      CBLService.BaseHeaderCreatorSignatureOffset +
      CBLService.CreatorSignatureSize
    );
  }

  /**
   * Offset of the file name length field in the header (instance method)
   */
  public get fileNameLengthOffset(): number {
    return this.baseHeaderCreatorSignatureOffset;
  }

  /**
   * Offset of the file name length field in the header (static for backward compatibility)
   * @deprecated Use instance method fileNameLengthOffset instead
   */
  public static get FileNameLengthOffset(): number {
    return CBLService.BaseHeaderCreatorSignatureOffset;
  }

  /**
   * Length of the file name length field in the header
   */
  public static readonly FileNameLengthSize: number = CONSTANTS['UINT16_SIZE'];

  /**
   * Length of the mime type length field in the header
   */
  public static readonly MimeTypeLengthSize: number = CONSTANTS['UINT8_SIZE'];

  /**
   * Instance offsets for dynamic provider support
   */
  public get headerOffsets() {
    return {
      CreatorId: 0,
      DateCreated: this.dateCreatedOffset,
      CblAddressCount: this.cblAddressCountOffset,
      TupleSize: this.tupleSizeOffset,
      OriginalDataLength: this.originalDataLengthOffset,
      OriginalDataChecksum: this.originalChecksumOffset,
      CreatorSignature: this.baseHeaderCreatorSignatureOffset,
      IsExtendedHeader: this.isExtendedHeaderOffset,
      FileNameLength: this.fileNameLengthOffset,
    };
  }

  /**
   * Static offsets for backward compatibility
   * @deprecated Use instance method headerOffsets instead
   */
  public static get HeaderOffsets() {
    return {
      CreatorId: 0,
      DateCreated: CBLService.DateCreatedOffset,
      CblAddressCount: CBLService.CblAddressCountOffset,
      TupleSize: CBLService.TupleSizeOffset,
      OriginalDataLength: CBLService.OriginalDataLengthOffset,
      OriginalDataChecksum: CBLService.OriginalChecksumOffset,
      CreatorSignature: CBLService.BaseHeaderCreatorSignatureOffset,
      IsExtendedHeader: CBLService.IsExtendedHeaderOffset,
      FileNameLength: CBLService.FileNameLengthOffset,
    };
  }

  /**
   * Check if the data is encrypted
   * @param data The data to check
   * @returns True if the data is encrypted, false otherwise
   */
  public isEncrypted(data: Uint8Array): boolean {
    return data[0] === ECIES.PUBLIC_KEY_MAGIC;
  }

  /**
   * Helper function to check if a string contains control characters
   * @param str The string to check
   * @returns True if the string contains control characters, false otherwise
   */
  public hasControlChars(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 32) {
        // ASCII control characters
        return true;
      }
    }
    return false;
  }

  /**
   * Get the creator ID from the header
   */
  public getCreatorId(header: Uint8Array): TID {
    const idBytes = header.subarray(
      this.headerOffsets.CreatorId,
      this.headerOffsets.CreatorId + this.creatorLength,
    );

    // Validate the byte length matches expected
    if (idBytes.length !== this.creatorLength) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `Creator ID byte length mismatch: got ${idBytes.length}, expected ${this.creatorLength}`,
      );
    }

    return this.enhancedProvider.fromBytes(idBytes);
  }

  /**
   * Get the date created from the header
   */
  public getDateCreated(header: Uint8Array): Date {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    const view = new DataView(
      header.buffer,
      header.byteOffset,
      header.byteLength,
    );
    const high = view.getUint32(this.headerOffsets.DateCreated, false);
    const low = view.getUint32(
      this.headerOffsets.DateCreated + CONSTANTS['UINT32_SIZE'],
      false,
    );
    return new Date(high * 0x100000000 + low);
  }

  /**
   * Get the Cbl address count from the header
   */
  public getCblAddressCount(header: Uint8Array): number {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    const view = new DataView(
      header.buffer,
      header.byteOffset,
      header.byteLength,
    );
    return view.getUint32(this.headerOffsets.CblAddressCount, false);
  }

  /**
   * Get the tuple size from the header
   */
  public getTupleSize(header: Uint8Array): number {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    return header[this.headerOffsets.TupleSize];
  }

  /**
   * Get the original data length from the header
   */
  public getOriginalDataLength(header: Uint8Array): number {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    const view = new DataView(
      header.buffer,
      header.byteOffset,
      header.byteLength,
    );
    const bigIntValue = view.getBigUint64(
      this.headerOffsets.OriginalDataLength,
      false,
    );
    return Number(bigIntValue);
  }

  /**
   * Get the original data checksum from the header
   * @param header - The header to get the checksum from
   * @returns The original data checksum
   */
  public getOriginalDataChecksum(header: Uint8Array): Checksum {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    const checksumData = header.subarray(
      this.headerOffsets.OriginalDataChecksum,
      this.headerOffsets.OriginalDataChecksum +
        CBLService.DataChecksumSize,
    );
    return Checksum.fromUint8Array(checksumData);
  }

  /**
   * Get the is extended header from the header
   */
  public isExtendedHeader(header: Uint8Array): boolean {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    return header[this.headerOffsets.IsExtendedHeader] === 1;
  }

  /**
   * Get cached extended header information
   */
  private getExtendedHeaderOffsets(header: Uint8Array): {
    fileNameLength: number;
    fileNameOffset: number;
    mimeTypeLength: number;
    mimeTypeOffset: number;
    signatureOffset: number;
  } {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }

    let offset = this.baseHeaderCreatorSignatureOffset;

    const view = new DataView(
      header.buffer,
      header.byteOffset,
      header.byteLength,
    );

    // Read file name length
    const fileNameLength = view.getUint16(offset, false);
    const fileNameOffset = offset + CONSTANTS['UINT16_SIZE'];
    offset = fileNameOffset + fileNameLength;

    // Read mime type length
    const mimeTypeLength = header[offset];
    const mimeTypeOffset = offset + CONSTANTS['UINT8_SIZE'];
    offset = mimeTypeOffset + mimeTypeLength;

    return {
      fileNameLength,
      fileNameOffset,
      mimeTypeLength,
      mimeTypeOffset,
      signatureOffset: offset,
    };
  }

  /**
   * Get the length of the file name from the header
   */
  public getFileNameLength(header: Uint8Array): number {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }
    return this.getExtendedHeaderOffsets(header).fileNameLength;
  }

  /**
   * Get the file name from the header
   */
  public getFileName(header: Uint8Array): string {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }

    const { fileNameOffset, fileNameLength } =
      this.getExtendedHeaderOffsets(header);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(
      header.subarray(fileNameOffset, fileNameOffset + fileNameLength),
    );
  }

  /**
   * Get the length of the mime type from the header
   */
  public getMimeTypeLength(header: Uint8Array): number {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }
    return this.getExtendedHeaderOffsets(header).mimeTypeLength;
  }

  /**
   * Get the mime type from the header
   */
  public getMimeType(header: Uint8Array): string {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }

    const { mimeTypeOffset, mimeTypeLength } =
      this.getExtendedHeaderOffsets(header);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(
      header.subarray(mimeTypeOffset, mimeTypeOffset + mimeTypeLength),
    );
  }

  /**
   * Get the creator signature from the header
   */
  public getSignature(header: Uint8Array): SignatureUint8Array {
    if (this.isEncrypted(header)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    const signatureOffset = !this.isExtendedHeader(header)
      ? this.headerOffsets.CreatorSignature
      : this.getExtendedHeaderOffsets(header).signatureOffset;

    return header.subarray(
      signatureOffset,
      signatureOffset + CBLService.CreatorSignatureSize,
    ) as unknown as SignatureUint8Array;
  }

  /**
   * Get the length of the header
   */
  public getHeaderLength(data: Uint8Array): number {
    if (this.isEncrypted(data)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (!this.isExtendedHeader(data)) {
      return this.baseHeaderSize;
    }
    const { signatureOffset } = this.getExtendedHeaderOffsets(data);
    return signatureOffset + CBLService.CreatorSignatureSize;
  }

  /**
   * Get the length of the block without padding
   */
  public getBlockDataLength(data: Uint8Array): number {
    if (this.isEncrypted(data)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    return (
      this.getHeaderLength(data) +
      this.getCblAddressCount(data) * CHECKSUM.SHA3_BUFFER_LENGTH
    );
  }

  /**
   * Get the address data from the CBL
   */
  public getAddressData(data: Uint8Array): Uint8Array {
    if (this.isEncrypted(data)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    const headerLength = this.getHeaderLength(data);
    const addressCount = this.getCblAddressCount(data);
    return data.subarray(
      headerLength,
      headerLength + addressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
    );
  }

  /**
   * Get the addresses from the CBL
   */
  public addressDataToAddresses(data: Uint8Array): Checksum[] {
    const addressData = this.getAddressData(data);
    const addressCount = this.getCblAddressCount(data);
    const addresses: Checksum[] = new Array(addressCount);

    for (let i = 0; i < addressCount; i++) {
      const addressOffset = i * CHECKSUM.SHA3_BUFFER_LENGTH;
      const checksumData = addressData.subarray(
        addressOffset,
        addressOffset + CHECKSUM.SHA3_BUFFER_LENGTH,
      );
      addresses[i] = Checksum.fromUint8Array(checksumData);
    }

    return addresses;
  }

  /**
   * Validate the signature of a CBL
   * @param data The CBL data
   * @param creator The creator of the CBL
   * @param blockSize The block size to use for validation (optional, defaults to calculated from data length)
   * @returns True if the signature is valid, false otherwise
   */
  public validateSignature(
    data: Uint8Array,
    creator: Member<TID>,
    blockSize?: BlockSize,
  ): boolean {
    if (this.isEncrypted(data)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }

    if (!creator || !creator.privateKey) {
      return false;
    }

    // Check if the creator ID in the header matches the provided creator
    const headerCreatorId = this.getCreatorId(data);
    if (!this.enhancedProvider.equals(headerCreatorId, creator.id)) {
      return false;
    }

    const headerLength = this.getHeaderLength(data);
    const headerWithoutSignature = data.subarray(
      0,
      headerLength - CBLService.CreatorSignatureSize,
    );

    // Get the block size from the parameter or calculate it from the data length
    const blockSizeBuffer = new Uint8Array(CONSTANTS['UINT32_SIZE']);
    writeUInt32BE(blockSize ?? lengthToBlockSize(data.length), blockSizeBuffer);

    // Get address list
    const addressList = data.subarray(
      headerLength,
      headerLength +
        this.getCblAddressCount(data) * CHECKSUM.SHA3_BUFFER_LENGTH,
    );

    // Combine arrays for signing
    const toSign = concatenateUint8Arrays([
      headerWithoutSignature,
      blockSizeBuffer,
      addressList,
    ]);

    const checksum = this.checksumService.calculateChecksum(toSign);
    const signature = this.getSignature(data);

    return this.eciesService.verifyMessage(
      creator.publicKey,
      checksum.toUint8Array(),
      signature,
    );
  }

  /**
   * Validate the file name format
   * @param fileName - The file name to validate
   * @throws ExtendedCblError if the file name is invalid
   */
  public validateFileNameFormat(fileName: string): void {
    if (!fileName) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameRequired);
    }

    const trimmed = fileName.trim();
    if (trimmed.length === 0) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameEmpty);
    }

    if (fileName !== trimmed) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameWhitespace);
    }

    if (fileName.length > CBL.MAX_FILE_NAME_LENGTH) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameTooLong);
    }

    // Check for special characters
    if (CBL.FILE_NAME_PATTERN.test(fileName) === false) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameInvalidChar);
    }

    // Check for control characters
    if (this.hasControlChars(fileName)) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameControlChars);
    }

    // Check for path traversal
    if (CBL.FILE_NAME_TRAVERSAL_PATTERN.test(fileName)) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNamePathTraversal);
    }
  }

  /**
   * Validates the format of a MIME type.
   */
  public validateMimeTypeFormat(mimeType: string): void {
    if (!mimeType) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeRequired);
    }

    const trimmed = mimeType.trim();
    if (trimmed.length === 0) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeEmpty);
    }

    if (mimeType !== trimmed) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeWhitespace);
    }

    if (trimmed !== trimmed.toLowerCase()) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeLowercase);
    }

    if (mimeType.length > CBL.MAX_MIME_TYPE_LENGTH) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeTooLong);
    }

    if (!CBL.MIME_TYPE_PATTERN.test(mimeType)) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeInvalidFormat);
    }
  }

  /**
   * Calculates the size of the extended header for CBL, given the file name and MIME type.
   * @param fileName File name
   * @param mimeType Mime type
   * @returns Size of the extended header
   */
  public calculateExtendedHeaderSize(
    fileName: string,
    mimeType: string,
  ): number {
    return (
      CONSTANTS['UINT16_SIZE'] +
      fileName.length +
      CONSTANTS['UINT8_SIZE'] +
      mimeType.length
    );
  }

  /**
   * Create an extended header for CBL
   */
  public makeExtendedHeader(fileName: string, mimeType: string): Uint8Array {
    this.validateFileNameFormat(fileName);
    this.validateMimeTypeFormat(mimeType);
    const totalLength = this.calculateExtendedHeaderSize(fileName, mimeType);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    // Write file name length and content
    const view = new DataView(result.buffer);
    view.setUint16(offset, fileName.length, false);
    offset += CONSTANTS['UINT16_SIZE'];
    const fileNameBytes = new TextEncoder().encode(fileName);
    result.set(fileNameBytes, offset);
    offset += fileNameBytes.length;

    // Write mime type length and content
    result[offset] = mimeType.length;
    offset += CONSTANTS['UINT8_SIZE'];
    const mimeTypeBytes = new TextEncoder().encode(mimeType);
    result.set(mimeTypeBytes, offset);

    return result;
  }

  /**
   * Create a CBL header.
   *
   * @param creator - The member creating the CBL
   * @param dateCreated - The creation date
   * @param cblAddressCount - Number of addresses in the CBL
   * @param fileDataLength - Length of the original file data
   * @param addressList - The list of block addresses
   * @param blockSize - The block size
   * @param encryptionType - The encryption type
   * @param extendedCBL - Optional extended CBL data (fileName, mimeType)
   * @param tupleSize - The tuple size (defaults to TUPLE.SIZE)
   * @returns Object containing headerData and signature
   * @throws {EnhancedValidationError} If block size or encryption type is invalid
   * @throws {CblError} If CBL-specific validation fails
   *
   * @see Requirements 5.1, 5.2, 5.3, 12.1, 12.2, 12.7
   */
  public makeCblHeader(
    creator: Member<TID>,
    dateCreated: Date,
    cblAddressCount: number,
    fileDataLength: number,
    addressList: Uint8Array,
    blockSize: BlockSize,
    encryptionType: BlockEncryptionType,
    extendedCBL?: { fileName: string; mimeType: string },
    tupleSize: number = TUPLE.SIZE,
  ): { headerData: Uint8Array; signature: SignatureUint8Array } {
    // Validate inputs using Validator
    Validator.validateRequired(creator, 'creator', 'makeCblHeader');
    Validator.validateRequired(dateCreated, 'dateCreated', 'makeCblHeader');
    Validator.validateRequired(addressList, 'addressList', 'makeCblHeader');
    Validator.validateBlockSize(blockSize, 'makeCblHeader');
    Validator.validateEncryptionType(encryptionType, 'makeCblHeader');

    if (fileDataLength > CBL.MAX_INPUT_FILE_SIZE) {
      throw new CblError(CblErrorType.FileSizeTooLarge);
    }
    if (tupleSize < TUPLE.MIN_SIZE || tupleSize > TUPLE.MAX_SIZE) {
      throw new CblError(CblErrorType.InvalidTupleSize);
    }
    if (extendedCBL && extendedCBL.fileName.length > CBL.MAX_FILE_NAME_LENGTH) {
      throw new CblError(CblErrorType.MimeTypeTooLong);
    }
    if (extendedCBL && extendedCBL.mimeType.length > CBL.MAX_MIME_TYPE_LENGTH) {
      throw new CblError(CblErrorType.MimeTypeTooLong);
    }
    if (
      cblAddressCount >
      this.calculateCBLAddressCapacity(blockSize, encryptionType)
    ) {
      throw new CblError(CblErrorType.AddressCountExceedsCapacity);
    }
    // Create buffers for header fields
    const buffers = this.createArrays();
    const timestamp = dateCreated.getTime();

    // Write timestamp using DataView
    const dateView = new DataView(buffers.dateCreated.buffer);
    dateView.setUint32(0, Math.floor(timestamp / 0x100000000), false);
    dateView.setUint32(
      CONSTANTS['UINT32_SIZE'],
      timestamp % 0x100000000,
      false,
    );

    const addressView = new DataView(buffers.addressCount.buffer);
    addressView.setUint32(0, cblAddressCount, false);

    const dataLengthView = new DataView(buffers.dataLength.buffer);
    dataLengthView.setBigUint64(0, BigInt(fileDataLength), false);

    buffers.tupleSize[0] = tupleSize;

    const blockSizeView = new DataView(buffers.blockSize.buffer);
    blockSizeView.setUint32(0, blockSize, false);

    // Calculate a checksum for the original data (empty for now, will be filled in later)
    const dataChecksum = new Uint8Array(
      CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
    );
    buffers.dataChecksum.set(dataChecksum);

    // Use the provider to convert creator ID to bytes
    const creatorIdBytes = this.enhancedProvider.toBytes(creator.id);

    // Validate that the provider returns the expected length
    if (creatorIdBytes.length !== this.creatorLength) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `Creator ID provider returned ${creatorIdBytes.length} bytes, expected ${this.creatorLength}`,
      );
    }

    const creatorId = creatorIdBytes;

    // Create base header
    const baseHeaderSize =
      creatorId.length +
      buffers.dateCreated.length +
      buffers.addressCount.length +
      buffers.tupleSize.length +
      buffers.dataLength.length +
      buffers.dataChecksum.length +
      CONSTANTS['UINT8_SIZE']; // Extended header flag

    const baseHeader = new Uint8Array(baseHeaderSize);
    let offset = 0;

    // Copy base header fields
    baseHeader.set(creatorId, offset);
    offset += creatorId.length;
    baseHeader.set(buffers.dateCreated, offset);
    offset += buffers.dateCreated.length;
    baseHeader.set(buffers.addressCount, offset);
    offset += buffers.addressCount.length;
    baseHeader.set(buffers.tupleSize, offset);
    offset += buffers.tupleSize.length;
    baseHeader.set(buffers.dataLength, offset);
    offset += buffers.dataLength.length;
    baseHeader.set(buffers.dataChecksum, offset);
    offset += buffers.dataChecksum.length;
    baseHeader[offset] = extendedCBL ? 1 : 0; // Set extended header flag

    // Create extended header if needed
    const extendedHeaderData = extendedCBL
      ? this.makeExtendedHeader(extendedCBL.fileName, extendedCBL.mimeType)
      : new Uint8Array(0);

    // Calculate checksum
    const toSignSize =
      baseHeader.length +
      extendedHeaderData.length +
      buffers.blockSize.length +
      addressList.length;
    const toSign = new Uint8Array(toSignSize);
    let signOffset = 0;
    toSign.set(baseHeader, signOffset);
    signOffset += baseHeader.length;
    toSign.set(extendedHeaderData, signOffset);
    signOffset += extendedHeaderData.length;
    toSign.set(buffers.blockSize, signOffset);
    signOffset += buffers.blockSize.length;
    toSign.set(addressList, signOffset);

    const checksum = this.checksumService.calculateChecksum(toSign);

    const signatureBytes = (creator instanceof Member && creator.privateKey
      ? new Uint8Array(
          this.eciesService.signMessage(
            creator.privateKey.value,
            checksum.toUint8Array(),
          ),
        )
      : new Uint8Array(ECIES.SIGNATURE_LENGTH)) as unknown as SignatureUint8Array;

    // Validate signature length
    if (signatureBytes.length !== ECIES.SIGNATURE_LENGTH) {
      throw new CblError(
        CblErrorType.InvalidSignature,
        `Signature length mismatch: got ${signatureBytes.length}, expected ${ECIES.SIGNATURE_LENGTH}`,
      );
    }

    // Construct final header
    const headerData = new Uint8Array(
      baseHeader.length + extendedHeaderData.length + signatureBytes.length,
    );
    let headerOffset = 0;
    headerData.set(baseHeader, headerOffset);
    headerOffset += baseHeader.length;
    headerData.set(extendedHeaderData, headerOffset);
    headerOffset += extendedHeaderData.length;
    headerData.set(signatureBytes, headerOffset);

    return { headerData, signature: signatureBytes };
  }

  /**
   * Parse the header of a constituent block list block
   * @param data The data to parse
   * @param creatorForValidation The creator of the block for validation
   * @returns The parsed header
   */
  public parseBaseHeader(
    data: Uint8Array,
    creatorForValidation?: Member<TID>,
  ): IConstituentBlockListBlockHeader<TID> {
    if (this.isEncrypted(data)) {
      throw new CblError(CblErrorType.CblEncrypted);
    }
    if (
      creatorForValidation &&
      !this.validateSignature(data, creatorForValidation)
    ) {
      throw new CblError(CblErrorType.InvalidSignature);
    }
    return {
      creatorId: this.getCreatorId(data),
      dateCreated: this.getDateCreated(data),
      cblAddressCount: this.getCblAddressCount(data),
      originalDataLength: this.getOriginalDataLength(data),
      tupleSize: this.getTupleSize(data),
      creatorSignature: this.getSignature(data),
    };
  }

  /**
   * Parse the header from the data
   * @param data The data to parse
   * @param creatorForValidation The creator to validate against
   * @returns The parsed header
   */
  public parseExtendedHeader(
    data: Uint8Array,
    creatorForValidation?: Member<TID>,
  ): IExtendedConstituentBlockListBlockHeader<TID> {
    const cblData = this.parseBaseHeader(data, creatorForValidation);

    const fileNameLength = this.getFileNameLength(data);
    const mimeTypeLength = this.getMimeTypeLength(data);

    const fileName = this.getFileName(data);
    const mimeType = this.getMimeType(data);

    this.validateFileNameFormat(fileName);
    this.validateMimeTypeFormat(mimeType);

    return {
      ...cblData,
      fileNameLength,
      fileName,
      mimeTypeLength,
      mimeType,
    };
  }

  /**
   * Parse the header from the data
   * @param data The data to parse
   * @param creatorForValidation The creator to validate against
   * @returns The parsed header
   */
  public parseHeader(
    data: Uint8Array,
    creatorForValidation?: Member<TID>,
  ):
    | IConstituentBlockListBlockHeader<TID>
    | IExtendedConstituentBlockListBlockHeader<TID> {
    return this.isExtendedHeader(data)
      ? this.parseExtendedHeader(data, creatorForValidation)
      : this.parseBaseHeader(data, creatorForValidation);
  }

  /**
   * Calculate the capacity of a CBL address block in terms of the number of addresses it can hold.
   * @param blockSiz The block size
   * @param allowEncryption Whether encryption is allowed
   * @param fileName The file name
   * @param mimeType The mime type
   * @returns number of addresses that can fit in the block
   */
  public calculateCBLAddressCapacity(
    blockSize: BlockSize,
    encryptedBlockType: BlockEncryptionType,
    cbl?: {
      fileName: string;
      mimeType: string;
    },
  ): number {
    let blockType: BlockType;
    if (cbl) {
      blockType =
        encryptedBlockType !== BlockEncryptionType.None
          ? BlockType.EncryptedExtendedConstituentBlockListBlock
          : BlockType.ExtendedConstituentBlockListBlock;
    } else {
      blockType =
        encryptedBlockType !== BlockEncryptionType.None
          ? BlockType.EncryptedConstituentBlockListBlock
          : BlockType.ConstituentBlockList;
    }

    const blockCapacityCalculator = new BlockCapacityCalculator(
      this,
      this.eciesService,
    );
    const result = blockCapacityCalculator.calculateCapacity({
      blockSize,
      blockType,
      encryptionType: encryptedBlockType,
      recipientCount:
        encryptedBlockType === BlockEncryptionType.MultiRecipient
          ? 1
          : undefined,
      ...(cbl
        ? {
            cbl,
          }
        : {}),
    });

    // Calculate how many addresses can fit in the available capacity
    const addressCapacity = Math.floor(
      result.availableCapacity / CHECKSUM.SHA3_BUFFER_LENGTH,
    );

    // Ensure it's a multiple of tuple size
    const tupleAlignedCapacity =
      Math.floor(addressCapacity / TUPLE.SIZE) * TUPLE.SIZE;

    // Ensure enough space for at least four addresses
    return addressCapacity < 4 ? 0 : Math.max(0, tupleAlignedCapacity);
  }
}
