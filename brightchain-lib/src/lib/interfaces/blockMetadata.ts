import { BlockDataType } from "../enumerations/blockDataType";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";

export interface IBlockMetadata {
  size: BlockSize;
  type: BlockType;
  dataType: BlockDataType;
  lengthBeforeEncryption: number;
  dateCreated: Date;
}