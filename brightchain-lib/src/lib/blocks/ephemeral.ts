import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from "../types";
import { BaseBlock } from "./baseBlock";

/**
 * Ephermal blocks are blocks that are not stored on disk, but are either input blocks or reconstituted blocks.
 */
export class EphemeralBlock extends BaseBlock {
  public readonly creatorId: RawGuidBuffer;
  public readonly creatorSignature: SignatureBuffer;
  public readonly blockDataLength: number;
  public readonly dataLength: bigint;
  public readonly cbl: boolean;

  constructor(creatorId: RawGuidBuffer, creatorSignature: SignatureBuffer, blockDataLength: number, dataLength: bigint, data: Buffer, cbl: boolean, dateCreated?: Date, checksum?: ChecksumBuffer) {
    super(data, dateCreated, checksum);
    this.creatorId = creatorId;
    this.creatorSignature = creatorSignature;
    this.blockDataLength = blockDataLength;
    this.dataLength = dataLength;
    this.cbl = cbl;
  }
}