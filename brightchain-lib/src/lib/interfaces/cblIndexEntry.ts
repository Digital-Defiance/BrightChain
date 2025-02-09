import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';

export interface ICBLIndexEntry {
  encrypted: boolean;
  blockType: BlockType;
  dataType: BlockDataType;
  addresses: string[];
  dateCreated: string;
  creatorId: string;
  fileDataLength?: string;
  blockDataLength: number;
}
