import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../enumerations/blockSize';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { ExtendedCblError } from '../errors/extendedCblError';
import { IExtendedConstituentBlockListBlock } from '../interfaces/blocks/extendedCbl';
import { ICBLServices } from '../interfaces/services/cblServices';
import { getGlobalServiceProvider } from '../services/globalServiceProvider';
import { ConstituentBlockListBlock } from './cbl';

/**
 * Extended CBL class, which extends the CBL class with additional properties
 * for extended CBLs (fileName + mimeType).
 * This introduces a variable length header
 */
export class ExtendedCBL<TID extends PlatformID = Uint8Array>
  extends ConstituentBlockListBlock<TID>
  implements IExtendedConstituentBlockListBlock<TID>
{
  constructor(
    data: Uint8Array,
    creator: Member<TID>,
    blockSize?: BlockSize,
    services?: ICBLServices<TID>,
  ) {
    super(data, creator, blockSize, services);
  }

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
    const filename = getGlobalServiceProvider().cblService.getFileName(
      this._data,
    );
    getGlobalServiceProvider().cblService.validateFileNameFormat(filename);
    return filename;
  }

  /**
   * The length of the file name
   */
  public get fileNameLength(): number {
    this.ensureHeaderValidated();
    return getGlobalServiceProvider().cblService.getFileNameLength(this._data);
  }

  /**
   * The MIME type of the file represented by the CBL
   */
  public get mimeType(): string {
    this.ensureHeaderValidated();
    const mimeType = getGlobalServiceProvider().cblService.getMimeType(
      this._data,
    );
    getGlobalServiceProvider().cblService.validateMimeTypeFormat(mimeType);
    return mimeType;
  }

  /**
   * The length of the MIME type
   */
  public get mimeTypeLength(): number {
    this.ensureHeaderValidated();
    return getGlobalServiceProvider().cblService.getMimeTypeLength(this._data);
  }

  /**
   * Validate the CBL structure and metadata
   */
  public override validateSync(): void {
    super.validateSync();

    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * Validate the CBL structure and metadata, async
   */
  public override async validateAsync(): Promise<void> {
    await super.validateAsync();

    if (!this.isExtendedCbl) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }
}
