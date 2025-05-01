import { BrightChainMember } from '../brightChainMember';
import { BlockType } from '../enumerations/blockType';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { ExtendedCblError } from '../errors/extendedCblError';
import { IExtendedConstituentBlockListBlock } from '../interfaces/blocks/extendedCbl';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
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
  // No delegate needed, using inheritance

  constructor(
    data: Buffer,
    creator: BrightChainMember,
    cblService: CBLService, // Add injected service
    checksumService: ChecksumService, // Add injected service
  ) {
    // Call the parent constructor with injected services
    super(data, creator, cblService, checksumService);
    // Ensure the base constructor correctly identified it as ExtendedCBL.
    // This check might still be needed if the base class logic isn't foolproof
    // or if we want to be extra certain at the ExtendedCBL level.
    // Let's keep a minimal check here for now.
    if (super.blockType !== BlockType.ExtendedConstituentBlockListBlock) {
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  // Remove the override for ensureHeaderValidated.
  // The base class implementation should be sufficient.
  // If specific ExtendedCBL validation *after* base validation is needed,
  // it should be added back carefully. For now, let's rely on the base.
  /*
  protected override ensureHeaderValidated(): void {
    super.ensureHeaderValidated();
    // Base validation should be sufficient. If it passes, and it's an
    // ExtendedCBL type, we should be good. No need for extra checks here.
  }
  */

  /**
   * The name of the file represented by the CBL
   */
  public get fileName(): string {
    this.ensureHeaderValidated();
    // Access _data inherited from EphemeralBlock via CBLBase
    // Use injected cblService
    const filename = this.cblService.getFileName(this._data);
    this.cblService.validateFileNameFormat(filename);
    return filename;
  }

  /**
   * The length of the file name
   */
  public get fileNameLength(): number {
    this.ensureHeaderValidated();
    // Use injected cblService
    return this.cblService.getFileNameLength(this._data);
  }

  /**
   * The MIME type of the file represented by the CBL
   */
  public get mimeType(): string {
    this.ensureHeaderValidated();
    // Use injected cblService
    const mimeType = this.cblService.getMimeType(this._data);
    this.cblService.validateMimeTypeFormat(mimeType);
    return mimeType;
  }

  /**
   * The length of the MIME type
   */
  public get mimeTypeLength(): number {
    this.ensureHeaderValidated();
    // Use injected cblService
    return this.cblService.getMimeTypeLength(this._data);
  }

  /**
   * Validate the CBL structure and metadata
   */
  public override validateSync(): void {
    // Validate base CBL structure first
    super.validateSync();

    // Ensure it's specifically an Extended CBL after base validation
    if (!super.isExtendedCbl) {
      // Use super.isExtendedCbl
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  /**
   * Validate the CBL structure and metadata, async
   */
  public override async validateAsync(): Promise<void> {
    // Validate base CBL structure first
    await super.validateAsync();

    // Ensure it's specifically an Extended CBL after base validation
    if (!super.isExtendedCbl) {
      // Use super.isExtendedCbl
      throw new ExtendedCblError(ExtendedCblErrorType.NotExtendedCbl);
    }
  }

  // All other properties and methods are inherited from CBLBase and EphemeralBlock
  // No need to forward them manually.
  // The 'data' getter is inherited from EphemeralBlock.
  // The 'validateSignature' method is inherited from CBLBase.
  // The 'encrypt' method is inherited from EphemeralBlock.
  // The 'getHandleTuples' method is inherited from CBLBase.
}
