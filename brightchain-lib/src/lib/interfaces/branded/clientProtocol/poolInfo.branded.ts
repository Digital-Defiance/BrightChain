import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IPoolInfo } from '../../clientProtocol/poolInfo';

const poolInfoSchema: InterfaceSchema = {
  poolId: { type: 'branded-primitive', ref: 'PoolId' },
  blockCount: { type: 'number' },
  totalSize: { type: 'number' },
  memberCount: { type: 'number' },
  encrypted: { type: 'boolean' },
  publicRead: { type: 'boolean' },
  publicWrite: { type: 'boolean' },
  hostingNodes: { type: 'array', items: { type: 'string' } },
};

export const PoolInfoDef = createBrandedInterface<
  IPoolInfo<string> & Record<string, unknown>
>('IPoolInfo', poolInfoSchema);
