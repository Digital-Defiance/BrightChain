/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockSize } from '@brightchain/brightchain-lib';
import { HexString } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IEnvironment as IEnvironmentBase } from '@digitaldefiance/node-express-suite';
import { IEnvironmentAws } from './environment-aws';

export interface IEnvironment<TID extends PlatformID> extends Omit<
  IEnvironmentBase<TID>,
  'adminId' | 'idAdapter'
> {
  adminId: any;
  idAdapter(bytes: Uint8Array): HexString;
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
