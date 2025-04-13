/* eslint-disable @typescript-eslint/no-explicit-any */
import { IEnvironment as IEnvironmentBase } from '@digitaldefiance/node-express-suite';
import { IEnvironmentAws } from './environment-aws';
import { BlockSize } from '@brightchain/brightchain-lib';

export interface IEnvironment extends Omit<
  IEnvironmentBase,
  'adminId' | 'idAdapter'
> {
  adminId: any;
  idAdapter(bytes: Uint8Array): any;
  /**
   * The FontAwesome kit ID
   */
  fontAwesomeKitId: string;
  /**
   * AWS configuration
   */
  aws: IEnvironmentAws;

  /**
   * Path for block-backed document store (disk). If unset, memory store may be used.
   */
  blockStorePath?: string;

  /**
   * Block size for block-backed document store.
   */
  blockStoreBlockSize: BlockSize;

  /**
   * Prefer in-memory document store (useful for demo/tests)
   */
  useMemoryDocumentStore: boolean;
}
