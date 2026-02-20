import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IPoolAclSummary } from '../../clientProtocol/poolInfo';

const poolAclSummarySchema: InterfaceSchema = {
  memberCount: { type: 'number' },
  adminCount: { type: 'number' },
  publicRead: { type: 'boolean' },
  publicWrite: { type: 'boolean' },
  currentUserPermissions: { type: 'array', items: { type: 'string' } },
};

export const PoolAclSummaryDef = createBrandedInterface<
  IPoolAclSummary<string> & Record<string, unknown>
>('IPoolAclSummary', poolAclSummarySchema);
