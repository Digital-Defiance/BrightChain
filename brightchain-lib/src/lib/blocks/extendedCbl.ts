import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { CHECKSUM } from '../constants';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize, validBlockSizes } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { ExtendedCblError } from '../errors/extendedCblError';
import { MetadataMismatchError } from '../errors/metadataMismatch';
import { GuidV4 } from '../guid';
import { IExtendedConstituentBlockListBlockHeader } from '../interfaces/ecblHeader';
import { IExtendedConstituentBlockListBlock } from '../interfaces/extendedCbl';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';

export class ExtendedCBL
  extends ConstituentBlockListBlock
  implements IExtendedConstituentBlockListBlock
{
  protected static override readonly checksumService =
    ServiceProvider.getChecksumService();
  protected static readonly FileMetadataHeaderSize = 512;
  private static readonly FileMetadataOffsets = {
    FileNameLength: 0,
    FileName: 2,
  } as const;
  private static readonly MaxFileNameLength = 255;
  private static readonly MaxMimeTypeLength = 127;
  private static readonly MimeTypePattern = /^[a-z0-9-]+\/[a-z0-9-]+$/;
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
  public readonly fileName!: string;
  public readonly mimeType!: string;

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
        dataAddresses.length * CHECKSUM.SHA3_BUFFER_LENGTH;

      if ((blockSize as number) < requiredSize) {
        throw new ExtendedCblError(
          ExtendedCblErrorType.InsufficientCapacity,
          blockSize,
          requiredSize,
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

      const checksum = ExtendedCBL.checksumService.calculateChecksum(data);

      // Create base CBL block first
      super(
        creator,
        new CblBlockMetadata(
          blockSize,
          BlockType.ExtendedConstituentBlockListBlock,
          BlockDataType.EphemeralStructuredData,
          dataAddresses.length * CHECKSUM.SHA3_BUFFER_LENGTH,
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
        throw new ExtendedCblError(ExtendedCblErrorType.InvalidStructure);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new ExtendedCblError(
          ExtendedCblErrorType.CreationFailed,
          undefined,
          undefined,
          `: ${error.message}`,
        );
      }
      throw new ExtendedCblError(ExtendedCblErrorType.CreationFailed);
    }
  }

  public override validateSync(): void {
    // Validate base CBL structure
    super.validateSync();

    if (this.creator === undefined) {
      throw new ExtendedCblError(ExtendedCblErrorType.CreatorUndefined);
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

  public override async validateAsync(): Promise<void> {
    // Validate base CBL structure
    await super.validateAsync();

    if (this.creator === undefined) {
      throw new ExtendedCblError(ExtendedCblErrorType.CreatorUndefined);
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

  public override get layerHeaderData(): Buffer {
    return ExtendedCBL.createFileMetadataHeader(this.fileName, this.mimeType);
  }

  public override get blockType(): BlockType {
    return BlockType.ExtendedConstituentBlockListBlock;
  }

  public override get payload(): Buffer {
    return super.payload;
  }

  public override get totalOverhead(): number {
    return super.totalOverhead + ExtendedCBL.FileMetadataHeaderSize;
  }

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
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameRequired);
    }

    const trimmed = fileName.trim();
    if (trimmed.length === 0) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameEmpty);
    }

    if (fileName !== trimmed) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameWhitespace);
    }

    if (fileName.length > ExtendedCBL.MaxFileNameLength) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameInvalidChar);
    }

    // Check for special characters
    for (const char of ExtendedCBL.InvalidSpecialChars) {
      if (fileName.includes(char)) {
        throw new ExtendedCblError(ExtendedCblErrorType.FileNameInvalidChar);
      }
    }

    // Check for control characters
    if (ExtendedCBL.hasControlChars(fileName)) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameControlChars);
    }

    // Check for path traversal
    if (/(^|[\\/])\.\.($|[\\/])/.test(fileName)) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNamePathTraversal);
    }
  }

  private static validateMimeTypeFormat(mimeType: string): void {
    if (!mimeType) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeRequired);
    }

    const trimmed = mimeType.trim().toLowerCase();
    if (trimmed.length === 0) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeEmpty);
    }

    if (mimeType !== trimmed) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeWhitespace);
    }

    if (mimeType.length > ExtendedCBL.MaxMimeTypeLength) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeInvalidFormat);
    }

    if (mimeType !== mimeType.toLowerCase()) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeLowercase);
    }

    if (!ExtendedCBL.MimeTypePattern.test(mimeType)) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeInvalidFormat);
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
      throw new ExtendedCblError(ExtendedCblErrorType.InvalidBlockSize);
    }

    // Validate block size is a valid enum value
    if (!validBlockSizes.includes(blockSize)) {
      throw new ExtendedCblError(ExtendedCblErrorType.InvalidBlockSize);
    }

    const totalOverhead = ExtendedCBL.calculateTotalOverhead();
    if ((blockSize as number) <= totalOverhead) {
      throw new ExtendedCblError(ExtendedCblErrorType.InvalidBlockSize);
    }
  }

  private static validateMetadataLengths(
    fileNameLength: number,
    mimeTypeLength: number,
  ): void {
    if (fileNameLength <= 0) {
      throw new ExtendedCblError(ExtendedCblErrorType.FileNameEmpty);
    }
    if (mimeTypeLength <= 0) {
      throw new ExtendedCblError(ExtendedCblErrorType.MimeTypeEmpty);
    }

    const totalSize = ExtendedCBL.calculateMetadataSize(
      fileNameLength,
      mimeTypeLength,
    );
    if (totalSize > ExtendedCBL.FileMetadataHeaderSize) {
      throw new ExtendedCblError(ExtendedCblErrorType.MetadataSizeExceeded);
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
      throw new ExtendedCblError(ExtendedCblErrorType.MetadataSizeNegative);
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

  public static override parseHeader(
    data: Buffer,
    creatorForValidation: BrightChainMember,
  ): IExtendedConstituentBlockListBlockHeader {
    if (!data || data.length < ExtendedCBL.FileMetadataHeaderSize) {
      throw new ExtendedCblError(ExtendedCblErrorType.InvalidMetadataBuffer);
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
}
