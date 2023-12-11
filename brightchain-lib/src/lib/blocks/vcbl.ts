import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import CONSTANTS from '../constants';
import { BlockSize } from '../enumerations/blockSize';
import { CblErrorType } from '../enumerations/cblErrorType';
import { CblError } from '../errors/cblError';
import { IVCBLBlock } from '../interfaces/blocks/vcbl';
import { EntryPropertyRecord } from '../interfaces/brightpass';
import { ICBLServices } from '../interfaces/services/cblServices';
import { VCBLService } from '../services/vcblService';
import { ExtendedCBL } from './extendedCbl';

export class VCBLBlock<TID extends PlatformID = Uint8Array>
  extends ExtendedCBL<TID>
  implements IVCBLBlock<TID>
{
  private _vaultHeaderData?: {
    vaultName: string;
    ownerMemberId: Uint8Array;
    createdAt: Date;
    modifiedAt: Date;
    sharedMemberIds: Uint8Array[];
  };
  private _propertyRecords?: EntryPropertyRecord[];
  private readonly vcblService: VCBLService<TID>;

  constructor(
    data: Uint8Array,
    creator: Member<TID>,
    blockSize?: BlockSize,
    services?: ICBLServices<TID>,
    vcblService?: VCBLService<TID>,
  ) {
    super(data, creator, blockSize, services);

    if (!vcblService) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'VCBLService is required for VCBLBlock',
      );
    }
    this.vcblService = vcblService;
  }

  private parseVaultData(): void {
    if (this._vaultHeaderData && this._propertyRecords) {
      return;
    }

    this.ensureHeaderValidated();

    // VCBL structure: CBL header + address list + vault header + property records
    // Get the extended CBL header length
    const extendedHeaderLength = this.getCblService().getHeaderLength(
      this._data,
    );

    // Calculate where vault data starts (after address list)
    const addressListLength =
      this.cblAddressCount * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH;
    const vaultHeaderStart = extendedHeaderLength + addressListLength;

    // Parse vault header
    this._vaultHeaderData = this.vcblService.parseVaultHeader(
      this._data.subarray(vaultHeaderStart),
    );

    // Calculate vault header size
    const encoder = new TextEncoder();
    const vaultNameBytes = encoder.encode(this._vaultHeaderData.vaultName);
    const vaultHeaderSize =
      2 +
      vaultNameBytes.length + // vault name
      this._vaultHeaderData.ownerMemberId.length + // owner ID
      8 + // createdAt
      8 + // modifiedAt
      2 + // shared member count
      this._vaultHeaderData.sharedMemberIds.length *
        this._vaultHeaderData.ownerMemberId.length;

    // Parse property records (after vault header)
    const propertyRecordsStart = vaultHeaderStart + vaultHeaderSize;
    const propertyRecordsData = this._data.subarray(propertyRecordsStart);

    this._propertyRecords = this.vcblService.parsePropertyRecords(
      propertyRecordsData,
      this.cblAddressCount,
    );
  }

  public get vaultName(): string {
    this.parseVaultData();
    return this._vaultHeaderData!.vaultName;
  }

  public get vaultNameLength(): number {
    return this.vaultName.length;
  }

  public get ownerMemberId(): TID {
    this.parseVaultData();
    return this.getCblService().idProvider.fromBytes(
      this._vaultHeaderData!.ownerMemberId,
    );
  }

  public get vaultCreatedAt(): Date {
    this.parseVaultData();
    return this._vaultHeaderData!.createdAt;
  }

  public get vaultModifiedAt(): Date {
    this.parseVaultData();
    return this._vaultHeaderData!.modifiedAt;
  }

  public get sharedMemberCount(): number {
    this.parseVaultData();
    return this._vaultHeaderData!.sharedMemberIds.length;
  }

  public get sharedMemberIds(): TID[] {
    this.parseVaultData();
    return this._vaultHeaderData!.sharedMemberIds.map((id) =>
      this.getCblService().idProvider.fromBytes(id),
    );
  }

  public get propertyRecordCount(): number {
    this.parseVaultData();
    return this._propertyRecords!.length;
  }

  public get propertyRecords(): EntryPropertyRecord[] {
    this.parseVaultData();
    return this._propertyRecords!;
  }

  public getPropertyRecord(index: number): EntryPropertyRecord {
    this.parseVaultData();
    if (index < 0 || index >= this._propertyRecords!.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `Property record index ${index} out of bounds (0-${this._propertyRecords!.length - 1})`,
      );
    }
    return this._propertyRecords![index];
  }

  public override validateSync(): void {
    super.validateSync();

    // Validate VCBL-specific structure
    this.parseVaultData();

    // Verify index alignment: property records count must equal address count
    if (this._propertyRecords!.length !== this.cblAddressCount) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `VCBL index alignment violation: ${this._propertyRecords!.length} property records but ${this.cblAddressCount} addresses`,
      );
    }
  }

  public override async validateAsync(): Promise<void> {
    await super.validateAsync();

    // Validate VCBL-specific structure
    this.parseVaultData();

    // Verify index alignment: property records count must equal address count
    if (this._propertyRecords!.length !== this.cblAddressCount) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `VCBL index alignment violation: ${this._propertyRecords!.length} property records but ${this.cblAddressCount} addresses`,
      );
    }
  }
}
