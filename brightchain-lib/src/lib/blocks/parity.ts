import { BlockType } from "../enumerations/blockType";
import { BaseBlock } from "./base";

export class ParityBlock extends BaseBlock {
  public override readonly blockType: BlockType = BlockType.FECData;
  public override readonly rawData: boolean = true;
}