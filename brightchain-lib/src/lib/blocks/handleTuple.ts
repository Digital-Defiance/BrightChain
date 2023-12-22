import { TupleSize } from "../constants";
import { DiskBlockAsyncStore } from "../stores/diskBlockAsyncStore";
import { ChecksumBuffer } from "../types";
import { BlockHandle } from "./handle";

export class BlockHandleTuple {
    public readonly handles: BlockHandle[];
    public get blockIdsBuffer(): Buffer {
        return Buffer.concat(this.blockIds);
    }
    public get blockIds(): ChecksumBuffer[] {
        return this.handles.map((handle) => handle.id);
    }
    public async xor(diskBlockStore: DiskBlockAsyncStore): Promise<BlockHandle> {
        const result = diskBlockStore.xor(this.handles);
        return result;
    }
    constructor(handles: BlockHandle[]) {
        this.handles = handles;
        if (handles.length !== TupleSize) {
            throw new Error(`Tuple size must be ${TupleSize}`);
        }
    }
}