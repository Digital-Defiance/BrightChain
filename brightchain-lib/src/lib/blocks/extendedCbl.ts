import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize, validBlockSizes } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { MetadataMismatchError } from '../errors/metadataMismatch';
import { GuidV4 } from '../guid';
import { IExtendedConstituentBlockListBlockHeader } from '../interfaces/ecblHeader';
import { IExtendedConstituentBlockListBlock } from '../interfaces/extendedCbl';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';

/**
 * ExtendedCBL extends ConstituentBlockListBlock with file-specific metadata
 * in the Owner Free Filesystem (OFF).
 *
 * Structure:
 * [Base Block Header]
 * [Ephemeral Block Header]
 * [CBL Header]
 * [File Metadata Header]
 * [Block References]
 * [Padding]
 *
 * The layered structure ensures:
 * 1. Each layer adds its own header data
 * 2. Headers are concatenated in inheritance order
 * 3. Each layer can validate its own header
 * 4. Total overhead is sum of all layers
 */
export class ExtendedCBL
  extends ConstituentBlockListBlock
  implements IExtendedConstituentBlockListBlock
{
  /**
   * Fixed size in bytes reserved for file metadata header.
   * This size must be:
   * 1. Large enough to store typical file names and MIME types
   * 2. Small enough to leave space for block data
   * 3. Fixed to ensure consistent block structure
   * 4. Power of 2 for alignment efficiency
   * 5. Balanced between overhead and usable space
   */
  protected static readonly FileMetadataHeaderSize = 512; // 512 bytes for metadata

  /**
   * Header field offsets within the file metadata section
   */
  private static readonly FileMetadataOffsets = {
    FileNameLength: 0, // 2 bytes
    FileName: 2, // Variable length
    // MimeTypeLength and MimeType offsets are calculated based on fileName length
  } as const;

  private static readonly MaxFileNameLength = 255; // Standard max file name length
  private static readonly MaxMimeTypeLength = 127; // Reasonable limit for MIME type
  private static readonly MimeTypePattern = /^[a-z0-9-]+\/[a-z0-9-]+$/; // Lowercase MIME type pattern
  private static readonly InvalidSpecialChars = [
    '<',
    '>',
    ':',
    '"',
    '/',
    '\\',
    '|',
    '?',
    '*',
  ];

  /**
   * Original file name from source system
   */
  public readonly fileName: string;

  /**
   * File content MIME type
   */
  public readonly mimeType: string;

  /**
   * Create a new ExtendedCBL
   * @param blockSize - Size category for the block
   * @param creator - Block creator
   * @param fileDataLength - Original file data length
   * @param dataAddresses - List of data block references
   * @param fileName - Original file name
   * @param mimeType - File content MIME type
   * @param signature - Creator's signature
   * @param dateCreated - Block creation timestamp
   * @param tupleSize - Size of block tuples
   */
  constructor(
    blockSize: BlockSize,
    creator: BrightChainMember | GuidV4,
    fileDataLength: bigint,
    dataAddresses: Array<ChecksumBuffer>,
    fileName: string,
    mimeType: string,
    signature: SignatureBuffer,
    dateCreated?: Date,
    tupleSize?: number,
  ) {
    try {
      // Validate inputs
      ExtendedCBL.validateBlockSize(blockSize);
      ExtendedCBL.validateStrings(fileName, mimeType);

      // Normalize strings before validation
      const normalizedFileName = fileName.trim();
      const normalizedMimeType = mimeType.toLowerCase().trim();

      // Calculate required space
      const metadataSize = ExtendedCBL.calculateMetadataSize(
        normalizedFileName.length,
        normalizedMimeType.length,
      );

      // Validate block size can accommodate both CBL and metadata
      const requiredSize =
        ConstituentBlockListBlock.CblHeaderSize +
        metadataSize +
        dataAddresses.length * StaticHelpersChecksum.Sha3ChecksumBufferLength;

      if ((blockSize as number) < requiredSize) {
        throw new Error(
          `Block size ${blockSize} is too small to hold CBL data (${ConstituentBlockListBlock.CblHeaderSize}) + ` +
            `metadata (${metadataSize}) + addresses (${dataAddresses.length * StaticHelpersChecksum.Sha3ChecksumBufferLength})`,
        );
      }

      const baseHeader = ConstituentBlockListBlock.makeCblHeader(
        creator,
        dateCreated ?? new Date(),
        dataAddresses.length,
        fileDataLength,
        Buffer.concat(dataAddresses),
        blockSize,
        signature,
        tupleSize,
      );

      const extendedHeader = ExtendedCBL.createFileMetadataHeader(
        fileName,
        mimeType,
      );

      const data = Buffer.concat([
        baseHeader.headerData,
        extendedHeader,
        Buffer.concat(dataAddresses),
      ]);

      const checksum = StaticHelpersChecksum.calculateChecksum(data);

      // Create base CBL block first
      super(
        creator,
        new CblBlockMetadata(
          blockSize,
          BlockType.ExtendedConstituentBlockListBlock,
          BlockDataType.EphemeralStructuredData,
          dataAddresses.length * StaticHelpersChecksum.Sha3ChecksumBufferLength,
          fileDataLength,
          dateCreated,
          creator,
        ),
        data,
        checksum,
        signature,
      );

      // Store normalized strings
      this.fileName = normalizedFileName;
      this.mimeType = normalizedMimeType;

      // Validate the combined structure
      try {
        this.validateSync();
      } catch (error) {
        throw new Error('Invalid ExtendedCBL structure');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create ExtendedCBL: ${error.message}`);
      }
      throw new Error('Failed to create ExtendedCBL: Unknown error');
    }
  }

  /**
   * Get the complete block data including all headers and payload.
   * Format: [Base Headers][CBL Headers][File Metadata Header][Block References][Padding]
   */
  public override get data(): Buffer {
    // Get base CBL data without its payload
    const baseCblData = super.data.subarray(0, super.totalOverhead);

    // Create metadata header
    const metadataHeader = ExtendedCBL.createFileMetadataHeader(
      this.fileName,
      this.mimeType,
    );

    // Get CBL payload (block references)
    const blockReferences = super.payload;

    // Calculate padding size
    const contentLength =
      baseCblData.length + metadataHeader.length + blockReferences.length;
    const paddingLength = Math.max(
      0,
      (this.blockSize as number) - contentLength,
    );

    // Create parts array
    const parts = [
      baseCblData, // Base and CBL headers
      metadataHeader, // File metadata header
      blockReferences, // Block references from CBL
    ];

    // Only add padding if needed
    if (paddingLength > 0) {
      parts.push(Buffer.alloc(paddingLength, 0));
    }

    // Combine all parts in correct order
    return Buffer.concat(parts);
  }

  /**
   * Total overhead including file metadata.
   * Overhead = Base Header + CBL Header + File Metadata Header
   */
  public override get totalOverhead(): number {
    return super.totalOverhead + ExtendedCBL.FileMetadataHeaderSize;
  }

  /**
   * Get this layer's header data.
   * Format: [File Name Length (2)][File Name][MIME Type Length (2)][MIME Type][Padding]
   */
  public override get layerHeaderData(): Buffer {
    return ExtendedCBL.createFileMetadataHeader(this.fileName, this.mimeType);
  }

  /**
   * Block type is ExtendedConstituentBlockListBlock
   */
  public override get blockType(): BlockType {
    return BlockType.ExtendedConstituentBlockListBlock;
  }

  /**
   * Get the payload data (block references), excluding all headers.
   * This is the same as the CBL payload since we only add metadata in the header.
   */
  public override get payload(): Buffer {
    return super.payload;
  }

  /**
   * Synchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   * @throws {MetadataMismatchError} If metadata does not match stored values
   */
  public override validateSync(): void {
    // Validate base CBL structure
    super.validateSync();

    if (this.creator === undefined) {
      throw new Error("Creator can't be undefined");
    }

    // Validate file metadata by parsing this layer's header
    const { fileName, mimeType } = ExtendedCBL.parseHeader(
      this.layerHeaderData,
      this.creator,
    );

    // Verify metadata matches stored values
    if (
      fileName !== this.fileName ||
      mimeType !== this.mimeType ||
      this.data.length !== this.blockSize
    ) {
      throw new MetadataMismatchError();
    }
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   * @throws {MetadataMismatchError} If metadata does not match stored values
   */
  public override async validateAsync(): Promise<void> {
    // Validate base CBL structure
    await super.validateAsync();

    if (this.creator === undefined) {
      throw new Error("Creator can't be undefined");
    }

    // Validate file metadata by parsing this layer's header
    const { fileName, mimeType } = ExtendedCBL.parseHeader(
      this.layerHeaderData,
      this.creator,
    );

    // Verify metadata matches stored values
    if (
      fileName !== this.fileName ||
      mimeType !== this.mimeType ||
      this.data.length !== this.blockSize
    ) {
      throw new MetadataMismatchError();
    }
  }

  /**
   * Validate the creator's signature
   * @param creator - Optional creator to validate against (uses block's creator if not provided)
   */
  public override validateSignature(): boolean;
  public override validateSignature(creator: BrightChainMember): boolean;
  public override validateSignature(creator?: BrightChainMember): boolean {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }

    const validationCreator = creator ?? this.creator;
    if (!validationCreator) {
      throw new Error('Creator is required for signature validation');
    }

    return ConstituentBlockListBlock.validateSignature(
      this.data,
      validationCreator,
    );
  }

  // Static helper methods
  private static hasControlChars(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 32) {
        // ASCII control characters
        return true;
      }
    }
    return false;
  }

  private static validateFileNameFormat(fileName: string): void {
    if (!fileName) {
      throw new Error('File name is required');
    }

    const trimmed = fileName.trim();
    if (trimmed.length === 0) {
      throw new Error('File name cannot be empty');
    }

    if (fileName !== trimmed) {
      throw new Error('File name cannot start or end with spaces');
    }

    if (fileName.length > ExtendedCBL.MaxFileNameLength) {
      throw new Error(
        `File name length ${fileName.length} exceeds maximum ${ExtendedCBL.MaxFileNameLength}`,
      );
    }

    // Check for special characters
    for (const char of ExtendedCBL.InvalidSpecialChars) {
      if (fileName.includes(char)) {
        throw new Error(`File name contains invalid character: ${char}`);
      }
    }

    // Check for control characters
    if (ExtendedCBL.hasControlChars(fileName)) {
      throw new Error('File name contains control characters');
    }

    if (fileName.includes('..')) {
      throw new Error('File name cannot contain path traversal');
    }
  }

  private static validateMimeTypeFormat(mimeType: string): void {
    if (!mimeType) {
      throw new Error('MIME type is required');
    }

    const trimmed = mimeType.trim().toLowerCase();
    if (trimmed.length === 0) {
      throw new Error('MIME type cannot be empty');
    }

    if (mimeType !== trimmed) {
      throw new Error('MIME type cannot start or end with spaces');
    }

    if (mimeType.length > ExtendedCBL.MaxMimeTypeLength) {
      throw new Error(
        `MIME type length ${mimeType.length} exceeds maximum ${ExtendedCBL.MaxMimeTypeLength}`,
      );
    }

    if (mimeType !== mimeType.toLowerCase()) {
      throw new Error('MIME type must be lowercase');
    }

    if (!ExtendedCBL.MimeTypePattern.test(mimeType)) {
      throw new Error('Invalid MIME type format');
    }
  }

  private static validateStrings(fileName: string, mimeType: string): void {
    ExtendedCBL.validateFileNameFormat(fileName);
    ExtendedCBL.validateMimeTypeFormat(mimeType);

    // Validate combined lengths
    ExtendedCBL.validateMetadataLengths(fileName.length, mimeType.length);
  }

  private static validateBlockSize(blockSize: BlockSize): void {
    if (!blockSize || (blockSize as number) <= 0) {
      throw new Error('Invalid block size');
    }

    // Validate block size is a valid enum value
    if (!validBlockSizes.includes(blockSize)) {
      throw new Error(`Invalid block size: ${blockSize}`);
    }

    const totalOverhead = ExtendedCBL.calculateTotalOverhead();
    if ((blockSize as number) <= totalOverhead) {
      throw new Error(
        `Block size (${blockSize}) must be greater than total overhead (${totalOverhead})`,
      );
    }
  }

  private static validateMetadataLengths(
    fileNameLength: number,
    mimeTypeLength: number,
  ): void {
    if (fileNameLength <= 0) {
      throw new Error('File name cannot be empty');
    }
    if (mimeTypeLength <= 0) {
      throw new Error('MIME type cannot be empty');
    }

    const totalSize = ExtendedCBL.calculateMetadataSize(
      fileNameLength,
      mimeTypeLength,
    );
    if (totalSize > ExtendedCBL.FileMetadataHeaderSize) {
      throw new Error('Metadata size exceeds maximum allowed size');
    }
  }

  private static calculateMetadataSize(
    fileNameLength: number,
    mimeTypeLength: number,
  ): number {
    const totalSize =
      4 + // Length fields (2 bytes each)
      fileNameLength +
      mimeTypeLength;

    // Validate total size is not negative (could happen with very large values)
    if (totalSize < 0) {
      throw new Error('Total metadata size cannot be negative');
    }

    return totalSize;
  }

  private static calculateLayerOverhead(): number {
    return ExtendedCBL.FileMetadataHeaderSize;
  }

  private static calculateTotalOverhead(): number {
    return (
      ExtendedCBL.calculateLayerOverhead() + // Extended CBL metadata
      ConstituentBlockListBlock.CblHeaderSize // CBL header
    );
  }

  private static getMimeTypeLengthOffset(fileNameLength: number): number {
    return ExtendedCBL.FileMetadataOffsets.FileName + fileNameLength;
  }

  private static getMimeTypeOffset(fileNameLength: number): number {
    return ExtendedCBL.getMimeTypeLengthOffset(fileNameLength) + 2;
  }

  private static createFileMetadataHeader(
    fileName: string,
    mimeType: string,
  ): Buffer {
    // Validate inputs
    ExtendedCBL.validateStrings(fileName, mimeType);

    // Create header buffer
    const header = Buffer.alloc(ExtendedCBL.FileMetadataHeaderSize, 0);

    // Write file name length and data
    header.writeUInt16BE(
      fileName.length,
      ExtendedCBL.FileMetadataOffsets.FileNameLength,
    );
    Buffer.from(fileName).copy(
      header,
      ExtendedCBL.FileMetadataOffsets.FileName,
    );

    // Write MIME type length and data
    const mimeTypeLengthOffset = ExtendedCBL.getMimeTypeLengthOffset(
      fileName.length,
    );
    header.writeUInt16BE(mimeType.length, mimeTypeLengthOffset);

    const mimeTypeOffset = ExtendedCBL.getMimeTypeOffset(fileName.length);
    Buffer.from(mimeType).copy(header, mimeTypeOffset);

    return header;
  }

  /**
   * Parse metadata from a buffer
   * @param data - Metadata buffer
   * @param creatorForValidation - Creator for signature validation
   * @returns Parsed metadata fields
   */
  public static override parseHeader(
    data: Buffer,
    creatorForValidation: BrightChainMember,
  ): IExtendedConstituentBlockListBlockHeader {
    if (!data || data.length < ExtendedCBL.FileMetadataHeaderSize) {
      throw new Error('Invalid metadata buffer');
    }
    const cblData = ConstituentBlockListBlock.parseHeader(
      data,
      creatorForValidation,
    );

    // Read lengths
    const fileNameLength = data.readUInt16BE(
      ExtendedCBL.FileMetadataOffsets.FileNameLength,
    );
    const mimeTypeLength = data.readUInt16BE(
      ExtendedCBL.getMimeTypeLengthOffset(fileNameLength),
    );

    // Read strings
    const fileName = data
      .subarray(
        ExtendedCBL.FileMetadataOffsets.FileName,
        ExtendedCBL.FileMetadataOffsets.FileName + fileNameLength,
      )
      .toString();

    const mimeTypeOffset = ExtendedCBL.getMimeTypeOffset(fileNameLength);
    const mimeType = data
      .subarray(mimeTypeOffset, mimeTypeOffset + mimeTypeLength)
      .toString();

    // Validate parsed strings
    ExtendedCBL.validateStrings(fileName, mimeType);

    return {
      ...cblData,
      fileNameLength,
      fileName,
      mimeTypeLength,
      mimeType,
    };
  }

  /**
   * Alias for validateSync() to maintain compatibility
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   * @throws {MetadataMismatchError} If metadata does not match stored values
   */
  public override validate(): void {
    this.validateSync();
  }
}
