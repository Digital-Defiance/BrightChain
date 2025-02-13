import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { ExtendedCblError } from '../errors/extendedCblError';
import { IExtendedConstituentBlockListBlock } from '../interfaces/extendedCbl';
import { CBLCore } from './cblCore';

/**
 * Extended CBL class, which extends the CBL class with additional properties
 * for extended CBLs (fileName + mimeType).
 * This introduces a variable length header
 */
export class ExtendedCBL
  extends CBLCore
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
    const filename = CBLCore.CblService.getFileName(this._data);
    CBLCore.CblService.validateFileNameFormat(filename);
    return filename;
  }

  /**
   * The MIME type of the file represented by the CBL
   */
  public get mimeType(): string {
    this.ensureHeaderValidated();
    const mimeType = CBLCore.CblService.getMimeType(this._data);
    CBLCore.CblService.validateMimeTypeFormat(mimeType);
    return mimeType;
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
   * Get the maximum number of addresses that can be stored in a CBL block.
   * Does not account for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get addressCapacity(): number {
    return CBLCore.CblService.calculateCBLAddressCapacity(
      this.blockSize,
      false,
      this.fileName,
      this.mimeType,
    );
  }

  /**
   * Get the maximum number of addresses that can be stored in an encrypted CBL block.
   * Accounts for encryption overhead.
   * @returns The maximum number of addresses
   */
  public get encryptedAddressCapacity(): number {
    return CBLCore.CblService.calculateCBLAddressCapacity(
      this.blockSize,
      true,
      this.fileName,
      this.mimeType,
    );
  }
}
