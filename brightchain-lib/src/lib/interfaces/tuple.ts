import { BaseBlock } from '../blocks/base';
import { BlockHandle } from '../blocks/handle';
import { IBaseBlock } from './blocks/base';

/**
 * Interface for block tuples.
 *
 * @remarks
 * Tuples can contain either concrete BaseBlock instances, IBaseBlock interfaces,
 * or BlockHandle instances for lazy loading.
 */
export interface ITuple {
  blocks: (IBaseBlock | BlockHandle<BaseBlock>)[];
}
