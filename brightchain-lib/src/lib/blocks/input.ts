import { BlockType } from "../enumerations/blockType"
import { EphemeralBlock } from "./ephemeral"

export class InputBlock extends EphemeralBlock {
  public readonly blockType: BlockType = BlockType.Input;
}