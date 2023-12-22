import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { BaseBlock } from "../blocks/base";
import { ChecksumBuffer } from "../types";
import { BlockSize } from "../enumerations/blockSizes";
import { ISimpleStore } from "../interfaces/simpleStore";
import { DiskBlockStore } from "./diskBlockStore";

export class DiskBlockSyncStore extends DiskBlockStore implements ISimpleStore<ChecksumBuffer, BaseBlock> {
  constructor(storePath: string, blockSize: BlockSize) {
    super(storePath, blockSize);
  }
  has(key: ChecksumBuffer): boolean {
    const blockPath = this.blockPath(key);
    return existsSync(blockPath);
  }
  get(key: ChecksumBuffer): BaseBlock {
    const blockPath = this.blockPath(key);
    const dateCreated = statSync(blockPath).ctime;
    const blockData = readFileSync(blockPath);
    if (blockData.length !== this._blockSize) {
      throw new Error(`Block size mismatch. Expected ${this._blockSize} but got ${blockData.length}.`);
    }
    const block = new BaseBlock(blockData, dateCreated, key);
    if (!block.validate()) {
      throw new Error(`Block ${key.toString('hex')} failed validation`);
    }
    return block;
  }
  set(key: ChecksumBuffer, value: BaseBlock): void {
    if (Buffer.compare(key, value.id) !== 0) {
      throw new Error(`Key ${key} does not match block ID ${value.id}`);
    }
    if (value.blockSize !== this._blockSize) {
      throw new Error(`Block size mismatch. Expected ${this._blockSize} but got ${value.blockSize}.`);
    }
    const blockPath = this.blockPath(value.id);
    if (existsSync(blockPath)) {
      throw new Error(`Block path ${blockPath} already exists`);
    } else {
      this.ensureBlockPath(value.id);
    }
    writeFileSync(blockPath, value.data);
  }
}