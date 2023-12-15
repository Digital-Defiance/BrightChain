import { Readable, Transform, Writable } from 'stream';
import {
  ChecksumBuffer,
  ChecksumString,
  ShortHexGuid,
} from '../types';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import {
  BlockSize,
  blockSizeToLength,
  lengthToBlockSize,
  nextLargestBlockSize,
  validateBlockSize,
} from '../enumerations/blockSizes';
import { GuidV4 } from '../guid';
import { BlockDto } from './blockDto';
import { randomBytes } from 'crypto';
import { StaticHelpers } from '../staticHelpers';

export class Block {
  constructor(
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer
  ) {
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
  public get dataStream(): Readable {
    return Readable.from(this.data);
  }
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
  public xorStream(other: Block): Transform {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes do not match');
    }

    let index = 0;
    const xorTransform = new Transform({
      transform(chunk, encoding, callback) {
        const result = Buffer.alloc(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
          result[i] = chunk[i] ^ other.data[index + i];
        }
        index += chunk.length;
        this.push(result);
        callback();
      },
    });

    this.dataStream.pipe(xorTransform);
    return xorTransform;
  }
  public async xor(other: Block): Promise<Block> {
    if (this.blockSize !== other.blockSize) {
      throw new Error('Block sizes do not match');
    }

    return new Promise((resolve, reject) => {
      // Perform XOR operation
      const xorStream = this.xorStream(other);

      // Collect XOR result
      let xorResult = Buffer.alloc(this.data.length);
      let offset = 0;

      xorStream.on('data', (chunk) => {
        chunk.copy(xorResult, offset);
        offset += chunk.length;
      });

      xorStream.on('end', () => {
        // xorResult now contains the XOR of this block and other block
        resolve(new Block(xorResult));
      });

      xorStream.on('error', (err) => {
        console.error('Error during XOR operation:', err);
        reject(err);
      });
    });
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
  public static fromDto(
    dto: BlockDto,
  ): Block {
    return new Block(
      StaticHelpers.HexStringToBuffer(dto.data),
      new Date(dto.dateCreated),
      StaticHelpersChecksum.checksumStringToChecksumBuffer(dto.id)
    );
  }
  public static fromJson(
    json: string,
  ): Block {
    const dto = JSON.parse(json) as BlockDto;
    const block = Block.fromDto(dto);
    if (!block.validate()) {
      throw new Error('Checksum mismatch');
    }
    return block;
  }
  public static newBlock(
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer
  ): Block {
    const blockSize = nextLargestBlockSize(data.length);
    const blockLength = blockSizeToLength(blockSize);
    // fill the buffer with zeros to the next block size
    const buffer = Buffer.alloc(blockLength);
    // copy the data into the buffer
    data.copy(buffer);
    // fill the rest with random bytes
    const fillLength = blockLength - data.length;
    const fillBuffer = randomBytes(fillLength);
    fillBuffer.copy(buffer, data.length);
    const block = new Block(buffer, dateCreated, checksum);
    if (checksum && !block.validate()) {
      throw new Error('Checksum mismatch');
    }
    return block;
  }
}
