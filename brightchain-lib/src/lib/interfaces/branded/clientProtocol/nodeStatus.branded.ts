import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { INodeStatus } from '../../clientProtocol/nodeStatus';

const nodeStatusSchema: InterfaceSchema = {
  nodeId: { type: 'string' },
  healthy: { type: 'boolean' },
  uptime: { type: 'number' },
  version: { type: 'string' },
  capabilities: { type: 'array', items: { type: 'string' } },
  partitionMode: { type: 'boolean' },
  disconnectedPeers: {
    type: 'array',
    items: { type: 'string' },
    optional: true,
  },
};

export const NodeStatusDef = createBrandedInterface<
  INodeStatus<string> & Record<string, unknown>
>('INodeStatus', nodeStatusSchema);
