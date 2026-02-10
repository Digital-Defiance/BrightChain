import {
  Member,
  PlatformID,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import CONSTANTS, { TUPLE } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { CblErrorType } from '../enumerations/cblErrorType';
import { CblError } from '../errors/cblError';
import { IBlockCapacityCalculator } from '../interfaces/blockCapacity';
import { EntryPropertyRecord } from '../interfaces/brightpass';
import { Validator } from '../utils/validator';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';

export interface VaultHeaderData {
  vaultName: string;
  ownerMemberId: Uint8Array;
  createdAt: Date;
  modifiedAt: Date;
  sharedMemberIds: Uint8Array[];
}

export class VCBLService<TID extends PlatformID = Uint8Array> {
  constructor(
    private readonly cblService: CBLService<TID>,
    private readonly checksumService: ChecksumService,
  ) {}

  serializePropertyRecord(record: EntryPropertyRecord): Uint8Array {
    const encoder = new TextEncoder();
    const titleBytes = encoder.encode(record.title);
    const tagsBytes = encoder.encode(record.tags.join(','));
    const siteUrlBytes = encoder.encode(record.siteUrl);

    const size =
      1 + // entryType
      2 +
      titleBytes.length + // title length + title
      2 +
      tagsBytes.length + // tags length + tags
      1 + // favorite
      8 + // createdAt
      8 + // updatedAt
      2 +
      siteUrlBytes.length; // siteUrl length + siteUrl

    const buffer = new Uint8Array(size);
    const view = new DataView(buffer.buffer);
    let offset = 0;

    // entryType (1 byte)
    const typeMap = { login: 0, secure_note: 1, credit_card: 2, identity: 3 };
    buffer[offset++] = typeMap[record.entryType];

    // title (2 bytes length + data)
    view.setUint16(offset, titleBytes.length, false);
    offset += 2;
    buffer.set(titleBytes, offset);
    offset += titleBytes.length;

    // tags (2 bytes length + data)
    view.setUint16(offset, tagsBytes.length, false);
    offset += 2;
    buffer.set(tagsBytes, offset);
    offset += tagsBytes.length;

    // favorite (1 byte)
    buffer[offset++] = record.favorite ? 1 : 0;

    // createdAt (8 bytes)
    view.setBigUint64(offset, BigInt(record.createdAt.getTime()), false);
    offset += 8;

    // updatedAt (8 bytes)
    view.setBigUint64(offset, BigInt(record.updatedAt.getTime()), false);
    offset += 8;

    // siteUrl (2 bytes length + data)
    view.setUint16(offset, siteUrlBytes.length, false);
    offset += 2;
    buffer.set(siteUrlBytes, offset);

    return buffer;
  }

  deserializePropertyRecord(
    data: Uint8Array,
    offset: number,
  ): { record: EntryPropertyRecord; bytesRead: number } {
    if (offset >= data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Offset exceeds data length',
      );
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const decoder = new TextDecoder();
    let currentOffset = offset;

    // entryType
    const typeMap = [
      'login',
      'secure_note',
      'credit_card',
      'identity',
    ] as const;
    const typeValue = data[currentOffset++];
    if (typeValue > 3) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `Invalid entry type: ${typeValue}`,
      );
    }
    const entryType = typeMap[typeValue];

    // title
    const titleLength = view.getUint16(currentOffset, false);
    currentOffset += 2;
    if (currentOffset + titleLength > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Title length exceeds data bounds',
      );
    }
    const title = decoder.decode(
      data.subarray(currentOffset, currentOffset + titleLength),
    );
    currentOffset += titleLength;

    // tags
    const tagsLength = view.getUint16(currentOffset, false);
    currentOffset += 2;
    if (currentOffset + tagsLength > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Tags length exceeds data bounds',
      );
    }
    const tagsStr = decoder.decode(
      data.subarray(currentOffset, currentOffset + tagsLength),
    );
    const tags = tagsStr ? tagsStr.split(',') : [];
    currentOffset += tagsLength;

    // favorite
    const favorite = data[currentOffset++] === 1;

    // createdAt
    if (currentOffset + 8 > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'CreatedAt exceeds data bounds',
      );
    }
    const createdAt = new Date(Number(view.getBigUint64(currentOffset, false)));
    currentOffset += 8;

    // updatedAt
    if (currentOffset + 8 > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'UpdatedAt exceeds data bounds',
      );
    }
    const updatedAt = new Date(Number(view.getBigUint64(currentOffset, false)));
    currentOffset += 8;

    // siteUrl
    const siteUrlLength = view.getUint16(currentOffset, false);
    currentOffset += 2;
    if (currentOffset + siteUrlLength > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'SiteUrl length exceeds data bounds',
      );
    }
    const siteUrl = decoder.decode(
      data.subarray(currentOffset, currentOffset + siteUrlLength),
    );
    currentOffset += siteUrlLength;

    return {
      record: {
        entryType,
        title,
        tags,
        favorite,
        createdAt,
        updatedAt,
        siteUrl,
      },
      bytesRead: currentOffset - offset,
    };
  }

  serializePropertyRecords(records: EntryPropertyRecord[]): Uint8Array {
    const serialized = records.map((r) => this.serializePropertyRecord(r));
    const totalSize = serialized.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const buf of serialized) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  }

  parsePropertyRecords(data: Uint8Array, count: number): EntryPropertyRecord[] {
    if (count < 0) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Property record count cannot be negative',
      );
    }
    const records: EntryPropertyRecord[] = [];
    let offset = 0;
    for (let i = 0; i < count; i++) {
      const { record, bytesRead } = this.deserializePropertyRecord(
        data,
        offset,
      );
      records.push(record);
      offset += bytesRead;
    }
    return records;
  }

  parseVaultHeader(data: Uint8Array): VaultHeaderData {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const decoder = new TextDecoder();
    let offset = 0;

    // vaultName (2 bytes length + data)
    const vaultNameLength = view.getUint16(offset, false);
    offset += 2;
    if (offset + vaultNameLength > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Vault name length exceeds data bounds',
      );
    }
    const vaultName = decoder.decode(
      data.subarray(offset, offset + vaultNameLength),
    );
    offset += vaultNameLength;

    // ownerMemberId (length from cblService + data)
    const ownerIdLength = this.cblService.creatorLength;
    if (offset + ownerIdLength > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Owner member ID exceeds data bounds',
      );
    }
    const ownerMemberId = data.subarray(offset, offset + ownerIdLength);
    offset += ownerIdLength;

    // createdAt (8 bytes)
    if (offset + 8 > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'CreatedAt exceeds data bounds',
      );
    }
    const createdAt = new Date(Number(view.getBigUint64(offset, false)));
    offset += 8;

    // modifiedAt (8 bytes)
    if (offset + 8 > data.length) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'ModifiedAt exceeds data bounds',
      );
    }
    const modifiedAt = new Date(Number(view.getBigUint64(offset, false)));
    offset += 8;

    // sharedMemberCount (2 bytes)
    const sharedMemberCount = view.getUint16(offset, false);
    offset += 2;

    // sharedMemberIds (array of member IDs)
    const sharedMemberIds: Uint8Array[] = [];
    for (let i = 0; i < sharedMemberCount; i++) {
      if (offset + ownerIdLength > data.length) {
        throw new CblError(
          CblErrorType.InvalidStructure,
          'Shared member ID exceeds data bounds',
        );
      }
      sharedMemberIds.push(data.subarray(offset, offset + ownerIdLength));
      offset += ownerIdLength;
    }

    return { vaultName, ownerMemberId, createdAt, modifiedAt, sharedMemberIds };
  }

  makeVcblHeader(
    creator: Member<TID>,
    vaultName: string,
    sharedMemberIds: TID[],
    propertyRecords: EntryPropertyRecord[],
    addressList: Uint8Array,
    blockSize: BlockSize,
    encryptionType: BlockEncryptionType,
  ): { headerData: Uint8Array; signature: SignatureUint8Array } {
    Validator.validateRequired(creator, 'creator', 'makeVcblHeader');
    Validator.validateRequired(vaultName, 'vaultName', 'makeVcblHeader');
    Validator.validateBlockSize(blockSize, 'makeVcblHeader');
    Validator.validateEncryptionType(encryptionType, 'makeVcblHeader');

    if (vaultName.length === 0 || vaultName.length > 255) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        'Vault name must be 1-255 characters',
      );
    }

    // Validate that property records count matches address count
    const expectedAddressCount =
      addressList.length / CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH;
    if (propertyRecords.length !== expectedAddressCount) {
      throw new CblError(
        CblErrorType.InvalidStructure,
        `Property record count (${propertyRecords.length}) must match address count (${expectedAddressCount})`,
      );
    }

    // Build vault header
    const encoder = new TextEncoder();
    const vaultNameBytes = encoder.encode(vaultName);
    const ownerIdBytes = creator.idBytes;
    const now = Date.now();

    const vaultHeaderSize =
      2 +
      vaultNameBytes.length + // vault name
      ownerIdBytes.length + // owner ID
      8 + // createdAt
      8 + // modifiedAt
      2 + // shared member count
      sharedMemberIds.length * ownerIdBytes.length; // shared member IDs

    const vaultHeader = new Uint8Array(vaultHeaderSize);
    const view = new DataView(vaultHeader.buffer);
    let offset = 0;

    // vault name
    view.setUint16(offset, vaultNameBytes.length, false);
    offset += 2;
    vaultHeader.set(vaultNameBytes, offset);
    offset += vaultNameBytes.length;

    // owner ID
    vaultHeader.set(ownerIdBytes, offset);
    offset += ownerIdBytes.length;

    // createdAt
    view.setBigUint64(offset, BigInt(now), false);
    offset += 8;

    // modifiedAt
    view.setBigUint64(offset, BigInt(now), false);
    offset += 8;

    // shared member count
    view.setUint16(offset, sharedMemberIds.length, false);
    offset += 2;

    // shared member IDs
    for (const memberId of sharedMemberIds) {
      const memberIdBytes = this.cblService.idProvider.toBytes(memberId);
      vaultHeader.set(memberIdBytes, offset);
      offset += memberIdBytes.length;
    }

    // Serialize property records
    const propertyRecordsData = this.serializePropertyRecords(propertyRecords);

    // Use CBLService to create extended CBL header
    // Pass lax=true to allow vault names with special characters (/, etc.)
    const { headerData, signature } = this.cblService.makeCblHeader(
      creator,
      new Date(now),
      addressList.length / CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
      0, // fileDataLength - not used for VCBL
      addressList,
      blockSize,
      encryptionType,
      { fileName: vaultName, mimeType: 'application/x-brightchain-vcbl' },
      TUPLE.SIZE,
      true, // lax=true to skip file name validation
    );

    // VCBL structure: CBL header + address list + vault header + property records
    // This ensures signature validation works (signature is over header + addressList)
    const totalSize =
      headerData.length +
      addressList.length +
      vaultHeader.length +
      propertyRecordsData.length;
    const result = new Uint8Array(totalSize);
    let resultOffset = 0;

    result.set(headerData, resultOffset);
    resultOffset += headerData.length;
    result.set(addressList, resultOffset);
    resultOffset += addressList.length;
    result.set(vaultHeader, resultOffset);
    resultOffset += vaultHeader.length;
    result.set(propertyRecordsData, resultOffset);

    return { headerData: result, signature };
  }

  estimateVaultHeaderSize(
    vaultName: string,
    sharedMemberCount: number,
  ): number {
    const encoder = new TextEncoder();
    const vaultNameBytes = encoder.encode(vaultName);
    return (
      2 +
      vaultNameBytes.length + // vault name
      this.cblService.creatorLength + // owner ID
      8 + // createdAt
      8 + // modifiedAt
      2 + // shared member count
      sharedMemberCount * this.cblService.creatorLength // shared member IDs
    );
  }

  estimatePropertyRecordsSize(
    records: EntryPropertyRecord[] | number,
    averageRecordSize: number = 100,
  ): number {
    if (typeof records === 'number') {
      return records * averageRecordSize;
    }
    return records.reduce((sum, record) => {
      const encoder = new TextEncoder();
      return (
        sum +
        1 +
        2 +
        encoder.encode(record.title).length +
        2 +
        encoder.encode(record.tags.join(',')).length +
        1 +
        8 +
        8 +
        2 +
        encoder.encode(record.siteUrl).length
      );
    }, 0);
  }

  calculateVcblCapacity(
    blockSize: BlockSize,
    encryptionType: BlockEncryptionType,
    vaultName: string,
    sharedMemberCount: number,
    propertyRecordCount: number,
    blockCapacityCalculator?: IBlockCapacityCalculator,
  ): number {
    const vaultHeaderSize = this.estimateVaultHeaderSize(
      vaultName,
      sharedMemberCount,
    );
    const propertyRecordsSize =
      this.estimatePropertyRecordsSize(propertyRecordCount);

    const result = this.cblService.calculateCBLAddressCapacity(
      blockSize,
      encryptionType,
      { fileName: 'vault', mimeType: 'application/x-brightchain-vcbl' },
      blockCapacityCalculator,
    );

    // Subtract vault-specific overhead from available capacity
    const vcblOverhead = vaultHeaderSize + propertyRecordsSize;
    const availableForAddresses = Math.max(
      0,
      result -
        Math.ceil(vcblOverhead / CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH),
    );

    return availableForAddresses;
  }

  recommendBlockSize(
    vaultName: string,
    sharedMemberCount: number,
    desiredEntryCount: number,
    encryptionType: BlockEncryptionType,
    _averagePropertyRecordSize: number = 100,
  ): BlockSize | null {
    const sizes = [BlockSize.Small, BlockSize.Medium, BlockSize.Large];

    for (const size of sizes) {
      const capacity = this.calculateVcblCapacity(
        size,
        encryptionType,
        vaultName,
        sharedMemberCount,
        desiredEntryCount,
      );

      if (capacity >= desiredEntryCount) {
        return size;
      }
    }

    return null;
  }
}
