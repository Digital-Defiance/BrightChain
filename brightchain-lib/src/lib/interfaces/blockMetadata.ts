import { BlockDataType } from "../enumerations/blockDataType";
import { BlockSize } from "../enumerations/blockSizes";
import { BlockType } from "../enumerations/blockType";

export interface BlockMetadata {
  size: BlockSize;
  type: BlockType;
  dataType: BlockDataType;
  lengthBeforeEncryption: number;
  dateCreated: Date;
}