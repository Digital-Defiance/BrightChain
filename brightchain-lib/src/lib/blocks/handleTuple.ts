import { TupleSize } from '../constants';
import { IBlockMetadata } from '../interfaces/blockMetadata';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { ChecksumBuffer } from '../types';
import { BlockHandle } from './handle';

export class BlockHandleTuple {
  public readonly handles: BlockHandle[];
  public get blockIdsBuffer(): Buffer {
    return Buffer.concat(this.blockIds);
  }
  public get blockIds(): ChecksumBuffer[] {
    return this.handles.map((handle) => handle.id);
  }
  public async xor(
    diskBlockStore: DiskBlockAsyncStore,
    destBlockMetadata: IBlockMetadata
  ): Promise<BlockHandle> {
    // how do we end up with a handle- write the block out? to what?
    throw new Error('Method not implemented.');
    // return diskBlockStore.xor(this.handles, destBlockMetadata);
  }
  constructor(handles: BlockHandle[]) {
    this.handles = handles;
    if (handles.length !== TupleSize) {
      throw new Error(`Tuple size must be ${TupleSize}`);
    }
  }
}
