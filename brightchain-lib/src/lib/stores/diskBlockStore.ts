import { existsSync, mkdirSync } from "fs";
import { ChecksumBuffer } from "../types";
import { join } from "path";
import { BlockSize, sizeToSizeString } from "../enumerations/blockSizes";

export class DiskBlockStore {
  public readonly _storePath: string;
  public readonly _blockSize: BlockSize;
  public blockDir(blockId: ChecksumBuffer): string {
    const checksumString = blockId.toString("hex");
    const blockSizeString = sizeToSizeString(this._blockSize);
    return join(this._storePath, blockSizeString, checksumString[0], checksumString[1]);
  }
  public blockPath(blockId: ChecksumBuffer): string {
    const checksumString = blockId.toString("hex");
    const blockSizeString = sizeToSizeString(this._blockSize);
    return join(this._storePath, blockSizeString, checksumString[0], checksumString[1], checksumString);
  }
  public ensureBlockPath(blockId: ChecksumBuffer): void {
    const blockDir = this.blockDir(blockId);
    if (!existsSync(blockDir)) {
      mkdirSync(blockDir, { recursive: true });
    }
  }
  constructor(storePath: string, blockSize: BlockSize) {
    this._storePath = storePath;
    this._blockSize = blockSize;
  }
}