import { Buffer } from 'buffer';
import { BrightChainMember } from '../brightChainMember';
import CONSTANTS, { CBL, CHECKSUM, ECIES, TUPLE } from '../constants';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSizes';
import { CblErrorType } from '../enumerations/cblErrorType';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { CblError } from '../errors/cblError';
import { ExtendedCblError } from '../errors/extendedCblError';
import { GuidV4 } from '../guid';
import { IConstituentBlockListBlockHeader } from '../interfaces/cblHeader';
import { IExtendedConstituentBlockListBlockHeader } from '../interfaces/ecblHeader';
import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from '../types';
import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';

/**
 * Service for creating and verifying CBL blocks
 */
export class CBLService {
  private readonly checksumService: ChecksumService;
  private readonly eciesService: ECIESService;
  constructor(checksumService: ChecksumService, eciesService: ECIESService) {
    this.checksumService = checksumService;
    this.eciesService = eciesService;
  }

  /** Create safe buffers for common operations */
  private createBuffers() {
    return {
      dateCreated: Buffer.alloc(CONSTANTS.UINT32_SIZE * 2),
      addressCount: Buffer.alloc(CONSTANTS.UINT32_SIZE),
      dataLength: Buffer.alloc(CONSTANTS.UINT32_SIZE),
      tupleSize: Buffer.alloc(CONSTANTS.UINT8_SIZE),
      blockSize: Buffer.alloc(CONSTANTS.UINT32_SIZE),
      fileNameLength: Buffer.alloc(CONSTANTS.UINT16_SIZE),
      mimeTypeLength: Buffer.alloc(CONSTANTS.UINT8_SIZE),
    };
  }

  /**
   * Length of the creator field in the header
   */
  public static readonly CreatorLength: number = GuidV4.guidBrandToLength(
    GuidBrandType.RawGuidBuffer,
  );

  /**
   * Length of the date field in the header
   * Date consists of two 32-bit unsigned integers (high/low)
   */
  public static readonly DateSize: number = CONSTANTS.UINT32_SIZE * 2;

  /**
   * Length of the address count field in the header
   */
  public static readonly AddressCountSize: number = CONSTANTS.UINT32_SIZE;

  /**
   * Length of the original data length field in the header
   */
  public static readonly DataLengthSize: number = CONSTANTS.UINT32_SIZE;

  /**
   * Length of the tuple size field in the header
   */
  public static readonly TupleSizeSize: number = CONSTANTS.UINT8_SIZE;

  /**
   * Length of the is extended header field in the header
   */
  public static readonly IsExtendedHeaderSize: number = CONSTANTS.UINT8_SIZE;

  /**
   * Length of the creator signature field in the header
   */
  public static readonly CreatorSignatureSize: number = ECIES.SIGNATURE_LENGTH;

  /**
   * Offset of the date field in the header
   */
  public static readonly DateCreatedOffset: number = CBLService.CreatorLength;

  /**
   * Offset of the address count field in the header
   */
  public static readonly CblAddressCountOffset: number =
    CBLService.DateCreatedOffset + CBLService.DateSize;

  /**
   * Offset of the original data length field in the header
   */
  public static readonly OriginalDataLengthOffset: number =
    CBLService.CblAddressCountOffset + CBLService.AddressCountSize;

  /**
   * Offset of the tuple size field in the header
   */
  public static readonly TupleSizeOffset: number =
    CBLService.OriginalDataLengthOffset + CBLService.DataLengthSize;

  /**
   * Offset of the is extended header field in the header
   */
  public static readonly IsExtendedHeaderOffset: number =
    CBLService.TupleSizeOffset + CBLService.TupleSizeSize;

  /**
   * Offset of the creator signature field in the header
   */
  public static readonly BaseHeaderCreatorSignatureOffset =
    CBLService.IsExtendedHeaderOffset + CBLService.IsExtendedHeaderSize;

  /**
   * Length of the base header with signature
   */
  public static readonly BaseHeaderSize: number =
    CBLService.BaseHeaderCreatorSignatureOffset +
    CBLService.CreatorSignatureSize;

  /**
   * Offset of the file name length field in the header
   */
  public static readonly FileNameLengthOffset: number =
    CBLService.BaseHeaderCreatorSignatureOffset;

  /**
   * Length of the file name length field in the header
   */
  public static readonly FileNameLengthSize: number = CONSTANTS.UINT16_SIZE;

  /**
   * Length of the mime type length field in the header
   */
  public static readonly MimeTypeLengthSize: number = CONSTANTS.UINT8_SIZE;

  /**
   * Offsets of the various fields in the header
   */
  public static readonly HeaderOffsets = {
    CreatorId: 0,
    DateCreated: CBLService.DateCreatedOffset,
    CblAddressCount: CBLService.CblAddressCountOffset,
    OriginalDataLength: CBLService.OriginalDataLengthOffset,
    TupleSize: CBLService.TupleSizeOffset,
    CreatorSignature: CBLService.BaseHeaderCreatorSignatureOffset,
    IsExtendedHeader: CBLService.IsExtendedHeaderOffset,
    FileNameLength: CBLService.FileNameLengthOffset,
  };

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
  public getCreatorId(header: Buffer): GuidV4 {
    return new GuidV4(
      header.slice(
        CBLService.HeaderOffsets.CreatorId,
        CBLService.CreatorLength,
      ) as RawGuidBuffer,
    );
  }

  /**
   * Get the date created from the header
   */
  public getDateCreated(header: Buffer): Date {
    const high = header.readUInt32BE(CBLService.HeaderOffsets.DateCreated);
    const low = header.readUInt32BE(
      CBLService.HeaderOffsets.DateCreated + CONSTANTS.UINT32_SIZE,
    );
    return new Date(high * 0x100000000 + low);
  }

  /**
   * Get the Cbl address count from the header
   */
  public getCblAddressCount(header: Buffer): number {
    return header.readUInt32BE(CBLService.HeaderOffsets.CblAddressCount);
  }

  /**
   * Get the original data length from the header
   */
  public getOriginalDataLength(header: Buffer): number {
    return header.readUInt32BE(CBLService.HeaderOffsets.OriginalDataLength);
  }

  /**
   * Get the tuple size from the header
   */
  public getTupleSize(header: Buffer): number {
    return header.readUInt8(CBLService.HeaderOffsets.TupleSize);
  }

  /**
   * Get the is extended header from the header
   */
  public isExtendedHeader(header: Buffer): boolean {
    return header.readUInt8(CBLService.HeaderOffsets.IsExtendedHeader) === 1;
  }

  /**
   * Get cached extended header information
   */
  private getExtendedHeaderOffsets(header: Buffer): {
    fileNameLength: number;
    fileNameOffset: number;
    mimeTypeLength: number;
    mimeTypeOffset: number;
    signatureOffset: number;
  } {
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }

    let offset = CBLService.BaseHeaderCreatorSignatureOffset;

    // Read file name length
    const fileNameLength = header.readUInt16BE(offset);
    const fileNameOffset = offset + CONSTANTS.UINT16_SIZE;
    offset = fileNameOffset + fileNameLength;

    // Read mime type length
    const mimeTypeLength = header.readUInt8(offset);
    const mimeTypeOffset = offset + CONSTANTS.UINT8_SIZE;
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
  public getFileNameLength(header: Buffer): number {
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }
    return this.getExtendedHeaderOffsets(header).fileNameLength;
  }

  /**
   * Get the file name from the header
   */
  public getFileName(header: Buffer): string {
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }

    const { fileNameOffset, fileNameLength } =
      this.getExtendedHeaderOffsets(header);
    return header
      .slice(fileNameOffset, fileNameOffset + fileNameLength)
      .toString('utf8');
  }

  /**
   * Get the length of the mime type from the header
   */
  public getMimeTypeLength(header: Buffer): number {
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }
    return this.getExtendedHeaderOffsets(header).mimeTypeLength;
  }

  /**
   * Get the mime type from the header
   */
  public getMimeType(header: Buffer): string {
    if (!this.isExtendedHeader(header)) {
      throw new CblError(CblErrorType.NotExtendedCbl);
    }

    const { mimeTypeOffset, mimeTypeLength } =
      this.getExtendedHeaderOffsets(header);
    return header
      .slice(mimeTypeOffset, mimeTypeOffset + mimeTypeLength)
      .toString('utf8');
  }

  /**
   * Get the creator signature from the header
   */
  public getSignature(header: Buffer): SignatureBuffer {
    const signatureOffset = !this.isExtendedHeader(header)
      ? CBLService.HeaderOffsets.CreatorSignature
      : this.getExtendedHeaderOffsets(header).signatureOffset;

    return header.slice(
      signatureOffset,
      signatureOffset + CBLService.CreatorSignatureSize,
    ) as SignatureBuffer;
  }

  /**
   * Get the length of the header
   */
  public getHeaderLength(data: Buffer): number {
    if (!this.isExtendedHeader(data)) {
      return CBLService.BaseHeaderSize;
    }
    const { signatureOffset } = this.getExtendedHeaderOffsets(data);
    return signatureOffset + CBLService.CreatorSignatureSize;
  }

  /**
   * Get the length of the block without padding
   */
  public getBlockDataLength(data: Buffer): number {
    return (
      this.getHeaderLength(data) +
      this.getCblAddressCount(data) * CHECKSUM.SHA3_BUFFER_LENGTH
    );
  }

  /**
   * Get the address data from the CBL
   */
  public getAddressData(data: Buffer): Buffer {
    const headerLength = this.getHeaderLength(data);
    const addressCount = this.getCblAddressCount(data);
    return data.slice(
      headerLength,
      headerLength + addressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
    );
  }

  /**
   * Get the addresses from the CBL
   */
  public addressDataToAddresses(data: Buffer): ChecksumBuffer[] {
    const addressData = this.getAddressData(data);
    const addressCount = this.getCblAddressCount(data);
    const addresses: ChecksumBuffer[] = new Array(addressCount);

    for (let i = 0; i < addressCount; i++) {
      const addressOffset = i * CHECKSUM.SHA3_BUFFER_LENGTH;
      addresses[i] = addressData.slice(
        addressOffset,
        addressOffset + CHECKSUM.SHA3_BUFFER_LENGTH,
      ) as ChecksumBuffer;
    }

    return addresses;
  }

  /**
   * Validate the signature of a CBL
   * @param data The CBL data
   * @param creator The creator of the CBL
   * @returns True if the signature is valid, false otherwise
   */
  public validateSignature(data: Buffer, creator: BrightChainMember): boolean {
    if (!creator || !creator.privateKey) {
      return false;
    }

    const headerLength = this.getHeaderLength(data);
    const headerWithoutSignature = data.slice(
      0,
      headerLength - CBLService.CreatorSignatureSize,
    );

    // Create block size buffer
    const blockSizeBuffer = Buffer.alloc(CONSTANTS.UINT32_SIZE);
    blockSizeBuffer.writeUInt32BE(lengthToBlockSize(data.length));

    // Get address list
    const addressList = data.slice(
      headerLength,
      headerLength +
        this.getCblAddressCount(data) * CHECKSUM.SHA3_BUFFER_LENGTH,
    );

    // Allocate and combine buffers for signing
    const toSignSize =
      headerWithoutSignature.length +
      blockSizeBuffer.length +
      addressList.length;
    const toSign = Buffer.alloc(toSignSize);

    let offset = 0;
    headerWithoutSignature.copy(toSign, offset);
    offset += headerWithoutSignature.length;

    blockSizeBuffer.copy(toSign, offset);
    offset += blockSizeBuffer.length;

    addressList.copy(toSign, offset);

    const checksum = this.checksumService.calculateChecksum(toSign);
    const signature = this.getSignature(data);

    return this.eciesService.verifyMessage(
      creator.publicKey,
      checksum,
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
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameInvalidChar);
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
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeInvalidFormat);
    }

    if (!CBL.MIME_TYPE_PATTERN.test(mimeType)) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeInvalidFormat);
    }
  }

  /**
   * Create an extended header for CBL
   */
  public makeExtendedHeader(fileName: string, mimeType: string): Buffer {
    this.validateFileNameFormat(fileName);
    this.validateMimeTypeFormat(mimeType);
    const totalLength =
      CONSTANTS.UINT16_SIZE +
      fileName.length +
      CONSTANTS.UINT8_SIZE +
      mimeType.length;
    const result = Buffer.alloc(totalLength);
    let offset = 0;

    // Write file name length and content
    result.writeUInt16BE(fileName.length, offset);
    offset += CONSTANTS.UINT16_SIZE;
    Buffer.from(fileName).copy(result, offset);
    offset += fileName.length;

    // Write mime type length and content
    result.writeUInt8(mimeType.length, offset);
    offset += CONSTANTS.UINT8_SIZE;
    Buffer.from(mimeType).copy(result, offset);

    return result;
  }

  /**
   * Create a CBL header
   */
  public makeCblHeader(
    creator: BrightChainMember | GuidV4,
    dateCreated: Date,
    cblAddressCount: number,
    fileDataLength: number,
    addressList: Buffer,
    blockSize: BlockSize,
    extendedCBL?: { fileName: string; mimeType: string },
    tupleSize: number = TUPLE.SIZE,
  ): { headerData: Buffer; signature: SignatureBuffer } {
    // Create buffers for header fields
    const buffers = this.createBuffers();
    const timestamp = dateCreated.getTime();
    buffers.dateCreated.writeUInt32BE(Math.floor(timestamp / 0x100000000), 0);
    buffers.dateCreated.writeUInt32BE(
      timestamp % 0x100000000,
      CONSTANTS.UINT32_SIZE,
    );

    buffers.addressCount.writeUInt32BE(cblAddressCount);
    buffers.dataLength.writeUInt32BE(fileDataLength);
    buffers.tupleSize.writeUInt8(tupleSize);
    buffers.blockSize.writeUInt32BE(blockSize);

    const creatorId =
      creator instanceof BrightChainMember
        ? creator.id.asRawGuidBuffer
        : creator.asRawGuidBuffer;

    // Create base header
    const baseHeaderSize =
      creatorId.length +
      buffers.dateCreated.length +
      buffers.addressCount.length +
      buffers.dataLength.length +
      buffers.tupleSize.length +
      CONSTANTS.UINT8_SIZE; // Extended header flag

    const baseHeader = Buffer.alloc(baseHeaderSize);
    let offset = 0;

    // Copy base header fields
    creatorId.copy(baseHeader, offset);
    offset += creatorId.length;
    buffers.dateCreated.copy(baseHeader, offset);
    offset += buffers.dateCreated.length;
    buffers.addressCount.copy(baseHeader, offset);
    offset += buffers.addressCount.length;
    buffers.dataLength.copy(baseHeader, offset);
    offset += buffers.dataLength.length;
    buffers.tupleSize.copy(baseHeader, offset);
    offset += buffers.tupleSize.length;
    baseHeader.writeUInt8(extendedCBL ? 1 : 0, offset); // Set extended header flag

    // Create extended header if needed
    const extendedHeaderData = extendedCBL
      ? this.makeExtendedHeader(extendedCBL.fileName, extendedCBL.mimeType)
      : Buffer.alloc(0);

    // Calculate checksum
    const toSign = Buffer.concat([
      baseHeader,
      extendedHeaderData,
      buffers.blockSize,
      addressList,
    ]);

    const checksum = this.checksumService.calculateChecksum(toSign);

    const finalSignature: SignatureBuffer =
      creator instanceof BrightChainMember && creator.privateKey
        ? this.eciesService.signMessage(creator.privateKey, checksum)
        : (Buffer.alloc(ECIES.SIGNATURE_LENGTH, 0) as SignatureBuffer);

    // Construct final header
    const headerData = Buffer.concat([
      baseHeader,
      extendedHeaderData,
      finalSignature,
    ]);

    return { headerData, signature: finalSignature };
  }

  /**
   * Parse the header of a constituent block list block
   * @param data The data to parse
   * @param creatorForValidation The creator of the block for validation
   * @returns The parsed header
   */
  public parseHeader(
    data: Buffer,
    creatorForValidation?: BrightChainMember,
  ): IConstituentBlockListBlockHeader {
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
    data: Buffer,
    creatorForValidation?: BrightChainMember,
  ): IExtendedConstituentBlockListBlockHeader {
    const cblData = this.parseHeader(data, creatorForValidation);

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
   * Calculate the capacity of a CBL address block in terms of the number of addresses it can hold.
   * @param blockSiz The block size
   * @param allowEncryption Whether encryption is allowed
   * @param fileName The file name
   * @param mimeType The mime type
   * @returns number of addresses that can fit in the block
   */
  public calculateCBLAddressCapacity(
    blockSize: BlockSize,
    allowEncryption = true,
    fileName?: string,
    mimeType?: string,
  ): number {
    // Calculate base header size
    let headerSize = CBLService.BaseHeaderSize;

    // Add extended header size if needed
    if (fileName && mimeType) {
      const extendedHeader = this.makeExtendedHeader(fileName, mimeType);
      headerSize += extendedHeader.length;
      headerSize += CONSTANTS.UINT8_SIZE; // Extended header flag
      headerSize += CONSTANTS.UINT32_SIZE; // Additional padding for extended header
    }

    // Calculate encryption overhead
    let encryptionOverhead = 0;
    if (allowEncryption) {
      encryptionOverhead += CONSTANTS.ECIES_OVERHEAD_LENGTH;
      encryptionOverhead += CONSTANTS.UINT32_SIZE * 16; // Block size buffer and padding
      encryptionOverhead += CHECKSUM.SHA3_BUFFER_LENGTH * 4; // Additional overhead for encryption
    }

    // Calculate extended header overhead
    let extendedHeaderOverhead = 0;
    if (fileName && mimeType) {
      const extendedHeader = this.makeExtendedHeader(fileName, mimeType);
      extendedHeaderOverhead += extendedHeader.length;
      extendedHeaderOverhead += CONSTANTS.UINT8_SIZE; // Extended header flag
      extendedHeaderOverhead += CONSTANTS.UINT32_SIZE * 8; // Additional padding for extended header
      extendedHeaderOverhead += CHECKSUM.SHA3_BUFFER_LENGTH * 2; // Additional overhead for extended data
    }

    // Calculate total overhead
    const totalOverhead =
      headerSize + encryptionOverhead + extendedHeaderOverhead;

    // Calculate available space
    const availableSpace = (blockSize as number) - totalOverhead;
    if (availableSpace <= CHECKSUM.SHA3_BUFFER_LENGTH * 4) {
      return 0; // Ensure enough space for at least four addresses
    }

    // Calculate address capacity ensuring it's a multiple of tuple size
    const addressCapacity = Math.floor(
      availableSpace / CHECKSUM.SHA3_BUFFER_LENGTH,
    );
    const tupleAlignedCapacity =
      Math.floor(addressCapacity / TUPLE.SIZE) * TUPLE.SIZE;
    return Math.max(0, tupleAlignedCapacity);
  }
}
