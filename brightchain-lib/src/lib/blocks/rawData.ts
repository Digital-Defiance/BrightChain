import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { IDataBlock } from '../interfaces/dataBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

export class RawDataBlock extends BaseBlock implements IDataBlock {
  private readonly _data: Buffer;
  private _validated: boolean;
  private readonly _dateCreated: Date;
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    dateCreated?: Date,
    checksum?: ChecksumBuffer,
    canRead = true,
    canPersist = true,
  ) {
    const now = new Date();
    const calculatedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    super(
      BlockType.RawData,
      BlockDataType.RawData,
      blockSize,
      checksum ?? calculatedChecksum,
      canRead,
      canPersist,
    );
    this._dateCreated = dateCreated ?? now;
    this._data = data;
    if (checksum) {
      this._validated = checksum.equals(calculatedChecksum);
    } else {
      // we calculated the checksum ourselves
      this._validated = true;
    }
  }
  public get data(): Buffer {
    return this._data;
  }
  public get validated(): boolean {
    return this._validated;
  }
  public get dateCreated(): Date {
    return this._dateCreated;
  }
  public get actualDataLength(): number {
    return this._data.length;
  }
  public get encrypted(): boolean {
    return false;
  }
  public get canEncrypt(): boolean {
    return false;
  }
  public get canDecrypt(): boolean {
    return false;
  }
  public get canSign(): boolean {
    return false;
  }
  public validate(): boolean {
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(
      this._data,
    );
    this._validated = computedChecksum.equals(this.idChecksum);
    return this._validated;
  }
}
