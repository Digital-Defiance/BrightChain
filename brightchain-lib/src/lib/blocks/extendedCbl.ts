import CONSTANTS from '../constants';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { ExtendedCblError } from '../errors/extendedCblError';
import { IExtendedConstituentBlockListBlock } from '../interfaces/blocks/extendedCbl';
import { ServiceProvider } from '../services/service.provider';
import { CBLBase } from './cblBase';

/**
 * Extended CBL class, which extends the CBL class with additional properties
 * for extended CBLs (fileName + mimeType).
 * This introduces a variable length header
 */
export class ExtendedCBL
  extends CBLBase
  implements IExtendedConstituentBlockListBlock
{
  protected override ensureHeaderValidated(): void {
    super.ensureHeaderValidated();
    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * The name of the file represented by the CBL
   */
  public get fileName(): string {
    this.ensureHeaderValidated();
    const filename = ServiceProvider.getInstance().cblService.getFileName(
      this._data,
    );
    ServiceProvider.getInstance().cblService.validateFileNameFormat(filename);
    return filename;
  }

  /**
   * The length of the file name
   */
  public get fileNameLength(): number {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getFileNameLength(
      this._data,
    );
  }

  /**
   * The MIME type of the file represented by the CBL
   */
  public get mimeType(): string {
    this.ensureHeaderValidated();
    const mimeType = ServiceProvider.getInstance().cblService.getMimeType(
      this._data,
    );
    ServiceProvider.getInstance().cblService.validateMimeTypeFormat(mimeType);
    return mimeType;
  }

  /**
   * The length of the MIME type
   */
  public get mimeTypeLength(): number {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getMimeTypeLength(
      this._data,
    );
  }

  /**
   * Validate the CBL structure and metadata
   */
  public override validateSync(): void {
    // Validate base CBL structure
    super.validateSync();

    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * Validate the CBL structure and metadata, async
   */
  public override async validateAsync(): Promise<void> {
    // Validate base CBL structure
    await super.validateAsync();

    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * Get the available capacity for payload data in this block
   */
  public override get availableCapacity(): number {
    const result =
      ServiceProvider.getInstance().blockCapacityCalculator.calculateCapacity({
        blockSize: this.blockSize,
        blockType: this.blockType,
        filename: this.fileName,
        mimetype: this.mimeType,
        usesStandardEncryption: false,
      });
    return result.availableCapacity;
  }

  /**
   * Get the maximum number of addresses that can be stored in a CBL block.
   * Does not account for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get addressCapacity(): number {
    return Math.floor(
      this.availableCapacity / CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH,
    );
  }

  /**
   * Get the maximum number of addresses that can be stored in an encrypted CBL block.
   * Accounts for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get encryptedAddressCapacity(): number {
    const result =
      ServiceProvider.getInstance().blockCapacityCalculator.calculateCapacity({
        blockSize: this.blockSize,
        blockType: this.blockType,
        filename: this.fileName,
        mimetype: this.mimeType,
        usesStandardEncryption: true,
      });
    return Math.floor(
      result.availableCapacity / CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH,
    );
  }
}
