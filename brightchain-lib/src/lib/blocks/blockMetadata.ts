import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { IBlockMetadata } from '../interfaces/blockMetadata';

/**
 * Concrete implementation of IBlockMetadata
 */
export class BlockMetadata implements IBlockMetadata {
  constructor(
    private readonly _size: BlockSize,
    private readonly _type: BlockType,
    private readonly _dataType: BlockDataType,
    private readonly _lengthWithoutPadding: number,
    private readonly _dateCreated: Date,
  ) {}

  public get size(): BlockSize {
    return this._size;
  }

  public get type(): BlockType {
    return this._type;
  }

  public get dataType(): BlockDataType {
    return this._dataType;
  }

  public get lengthWithoutPadding(): number {
    return this._lengthWithoutPadding;
  }

  public get dateCreated(): Date {
    return new Date(this._dateCreated.getTime());
  }
}
