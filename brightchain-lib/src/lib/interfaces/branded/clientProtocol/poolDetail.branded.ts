import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IPoolDetail } from '../../clientProtocol/poolInfo';

const poolDetailSchema: InterfaceSchema = {
  poolId: { type: 'branded-primitive', ref: 'PoolId' },
  blockCount: { type: 'number' },
  totalSize: { type: 'number' },
  memberCount: { type: 'number' },
  encrypted: { type: 'boolean' },
  publicRead: { type: 'boolean' },
  publicWrite: { type: 'boolean' },
  hostingNodes: { type: 'array', items: { type: 'string' } },
  owner: { type: 'string' },
  aclSummary: { type: 'branded-interface', ref: 'IPoolAclSummary' },
};

export const PoolDetailDef = createBrandedInterface<
  IPoolDetail<string> & Record<string, unknown>
>('IPoolDetail', poolDetailSchema);
