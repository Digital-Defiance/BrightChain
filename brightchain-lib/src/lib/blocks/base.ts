import { ChecksumBuffer, ChecksumString } from '../types';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import {
  BlockSize,
  lengthToBlockSize,
} from '../enumerations/blockSizes';
import { BlockDto } from './blockDto';
import { randomBytes } from 'crypto';
import { StaticHelpers } from '../staticHelpers';
import { BlockType } from '../enumerations/blockType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BrightChainMember } from '../brightChainMember';
import { EthereumECIES } from '../ethereumECIES';

export class BaseBlock {
  public readonly blockType: BlockType = BlockType.Unknown;
  public readonly blockSize: BlockSize;
  public readonly lengthBeforeEncryption: number;
  public readonly blockDataType: BlockDataType;
  constructor(blockSize: BlockSize, data: Buffer, blockDataType: BlockDataType, lengthBeforeEncryption: number, dateCreated?: Date, checksum?: ChecksumBuffer) {
    // data must either be unencrypted and less than or equal to the block size - overhead
    // or encrypted and equal to the block size
    this.blockSize = blockSize;
    this.blockDataType = blockDataType;
    if (blockDataType == BlockDataType.EncryptedData) {
      this.data = data;
      if (data.length !== blockSize as number) {
        throw new Error(
          `Encrypted data length ${data.length} is not a valid block size`
        );
      }
      this.lengthBeforeEncryption = lengthBeforeEncryption;
      if (this.lengthBeforeEncryption > (blockSize as number - EthereumECIES.ecieOverheadLength)) {
        throw new Error(
          `Length before encryption ${this.lengthBeforeEncryption} is too large for block size ${blockSize}`
        );
      }
    } else {
      this.data = data;
      if ((blockDataType == BlockDataType.RawData) && data.length !== blockSize as number) {
        throw new Error(
          `Raw data length ${data.length} is not valid for block size ${blockSize}`
        );
      } else if ((blockDataType == BlockDataType.EphemeralStructuredData) && (data.length > (blockSize as number - EthereumECIES.ecieOverheadLength))) {
        throw new Error(
          `Data length ${data.length} is too large for block size ${blockSize}`
        );
      }
      this.lengthBeforeEncryption = data.length;
    }
    if (checksum) {
      this.id = checksum;
    } else {
      const rawChecksum = StaticHelpersChecksum.calculateChecksum(this.data);
      this.id = rawChecksum;
      this._validated = true;
    }
    this.dateCreated = dateCreated ?? new Date();
  }
  public get encrypted() {
    return this.blockDataType == BlockDataType.EncryptedData;
  }
  public get rawData() {
    return this.blockDataType == BlockDataType.RawData;
  }
  public encrypt(creator: BrightChainMember): BaseBlock {
    if (this.encrypted) {
      throw new Error('Block is already encrypted');
    } else if (this.rawData) {
      throw new Error('Cannot encrypt raw data');
    }
    const neededPadding = this.blockSize as number - this.data.length - EthereumECIES.ecieOverheadLength;
    const padding = randomBytes(neededPadding);
    const paddedData = Buffer.concat([this.data, padding]);
    const encryptedData = creator.encryptData(paddedData);
    if (encryptedData.length !== this.blockSize) {
      throw new Error('Encrypted data length does not match block size');
    }
    return new BaseBlock(this.blockSize, encryptedData, BlockDataType.EncryptedData, this.lengthBeforeEncryption, this.dateCreated);
  }
  public decrypt(creator: BrightChainMember): BaseBlock {
    if (!this.encrypted) {
      throw new Error('Block is not encrypted');
    }
    const decryptedData = creator.decryptData(this.data);
    const data = decryptedData.subarray(0, this.lengthBeforeEncryption);
    return new BaseBlock(this.blockSize, data, BlockDataType.EphemeralStructuredData, this.lengthBeforeEncryption, this.dateCreated);
  }
  private _validated: boolean = false;
  public get validated(): boolean {
    return this._validated;
  }
  public readonly id: ChecksumBuffer;
  public readonly data: Buffer;
  public get checksumString(): ChecksumString {
    return StaticHelpersChecksum.checksumBufferToChecksumString(this.id);
  }
  public readonly dateCreated: Date;
  public validate(): boolean {
    const rawChecksum = StaticHelpersChecksum.calculateChecksum(
      this.data
    );
    const validated = rawChecksum.equals(this.id);
    this._validated = validated;
    return validated;
  }
  public xor<T extends BaseBlock>(other: BaseBlock, otherDataType?: BlockDataType): T {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes do not match');
    }
    if (this.data.length !== other.data.length) {
      throw new Error('Block data lengths do not match');
    }
    const blockSize = this.blockSize as number;
    const result = Buffer.alloc(blockSize);
    for (let i = 0; i < blockSize; i++) {
      result[i] = this.data[i] ^ other.data[i];
    }
    return new BaseBlock(this.blockSize, result, otherDataType ?? BlockDataType.RawData, blockSize) as T;
  }
  public toDto(): BlockDto {
    if (!this.rawData) {
      throw new Error('Only raw data blocks can be converted to DTO');
    }
    return {
      id: StaticHelpersChecksum.checksumBufferToChecksumString(this.id),
      data: StaticHelpers.bufferToHexString(this.data),
      dateCreated: this.dateCreated,
    };
  }
  public toJson(): string {
    return JSON.stringify(this.toDto());
  }
  public static fromDto(dto: BlockDto): BaseBlock {
    const dataLength = dto.data.length / 2;
    return new BaseBlock(
      lengthToBlockSize(dataLength),
      StaticHelpers.HexStringToBuffer(dto.data),
      BlockDataType.RawData,
      dataLength,
      new Date(dto.dateCreated),
      StaticHelpersChecksum.checksumStringToChecksumBuffer(dto.id)
    );
  }
  public static fromJson(json: string): BaseBlock {
    const dto = JSON.parse(json) as BlockDto;
    const block = BaseBlock.fromDto(dto);
    if (!block.validate()) {
      throw new Error('Checksum mismatch');
    }
    return block;
  }
  public static newBlock(
    blockSize: BlockSize,
    data: Buffer,
    blockDataType: BlockDataType,
    lengthBeforeEncryption: number,
    dateCreated?: Date,
    checksum?: ChecksumBuffer
  ): BaseBlock {
    const blockLength = blockSize as number;
    if ((blockDataType == BlockDataType.EncryptedData) && data.length !== blockLength) {
      throw new Error(
        `Encrypted data length ${data.length} is not a valid block size`
      );
    } else if ((blockDataType == BlockDataType.EphemeralStructuredData) && data.length > (blockLength - EthereumECIES.ecieOverheadLength)) {
      throw new Error(
        `Data length ${data.length} is too large for block size ${blockSize}`
      );
    }
    // fill the buffer with zeros to the next block size
    const buffer = Buffer.alloc(blockLength);
    // copy the data into the buffer
    data.copy(buffer);
    // fill the rest with random bytes
    const fillLength = blockLength - data.length;
    const fillBuffer = randomBytes(fillLength);
    fillBuffer.copy(buffer, data.length);
    const block = new BaseBlock(blockSize, buffer, blockDataType, lengthBeforeEncryption, dateCreated, checksum);
    if (checksum && !block.validate()) {
      throw new Error('Checksum mismatch');
    }
    return block;
  }
}
