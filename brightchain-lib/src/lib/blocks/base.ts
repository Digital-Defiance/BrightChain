import { ChecksumBuffer, ChecksumString } from '../types';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import {
  BlockSize,
  lengthToBlockSize,
  validateBlockSize,
} from '../enumerations/blockSizes';
import { BlockDto } from './blockDto';
import { randomBytes } from 'crypto';
import { StaticHelpers } from '../staticHelpers';
import { BlockType } from '../enumerations/blockType';

export class BaseBlock {
  public readonly blockType: BlockType = BlockType.Unknown;
  public readonly reconstituted: boolean = false;
  constructor(data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    if (!validateBlockSize(data.length)) {
      throw new Error(`Data length ${data.length} is not a valid block size`);
    }
    this.data = data;
    if (checksum) {
      this.id = checksum;
    } else {
      const rawChecksum = StaticHelpersChecksum.calculateChecksum(this.data);
      this.id = rawChecksum;
      this._validated = true;
    }
    this.dateCreated = dateCreated ?? new Date();
  }
  private _validated: boolean = false;
  public get validated(): boolean {
    return this._validated;
  }
  public readonly id: ChecksumBuffer;
  public get blockSize(): BlockSize {
    return lengthToBlockSize(this.data.length);
  }
  public readonly data: Buffer;
  public get checksumString(): ChecksumString {
    return StaticHelpersChecksum.checksumBufferToChecksumString(this.id);
  }
  public readonly dateCreated: Date;
  public validate(): boolean {
    const rawChecksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.from(this.data)
    );
    const validated = rawChecksum.equals(this.id);
    this._validated = validated;
    return validated;
  }
  public xor(other: BaseBlock): BaseBlock {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes do not match');
    }

    const result = Buffer.alloc(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      result[i] = this.data[i] ^ other.data[i];
    }
    return new BaseBlock(result);
  }
  public toDto(): BlockDto {
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
    return new BaseBlock(
      StaticHelpers.HexStringToBuffer(dto.data),
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
    dateCreated?: Date,
    checksum?: ChecksumBuffer
  ): BaseBlock {
    const blockLength = blockSize as number;
    if (data.length > blockLength) {
      throw new Error('Data is too large for block size');
    }
    // fill the buffer with zeros to the next block size
    const buffer = Buffer.alloc(blockLength);
    // copy the data into the buffer
    data.copy(buffer);
    // fill the rest with random bytes
    const fillLength = blockLength - data.length;
    const fillBuffer = randomBytes(fillLength);
    fillBuffer.copy(buffer, data.length);
    const block = new BaseBlock(buffer, dateCreated, checksum);
    if (checksum && !block.validate()) {
      throw new Error('Checksum mismatch');
    }
    return block;
  }
}
