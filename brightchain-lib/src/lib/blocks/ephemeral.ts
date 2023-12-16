import { BlockType } from "../enumerations/blockType";
import { ChecksumBuffer } from "../types";
import { BaseBlock } from "./baseBlock";

/**
 * Ephermal blocks are blocks that are not stored on disk, but are either input blocks or reconstituted blocks.
 */
export class EphemeralBlock extends BaseBlock {
  public readonly ephemeral: boolean = true;
  public readonly blockType: BlockType = BlockType.EphemeralReconstitutedBlock;
  constructor(data: Buffer, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(data, dateCreated, checksum);

  }
}