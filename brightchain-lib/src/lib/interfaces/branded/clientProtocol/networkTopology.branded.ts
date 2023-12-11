import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { INetworkTopology } from '../../clientProtocol/peerInfo';

const networkTopologySchema: InterfaceSchema = {
  localNodeId: { type: 'string' },
  peers: { type: 'array', items: { type: 'object' } },
  totalConnected: { type: 'number' },
};

export const NetworkTopologyDef = createBrandedInterface<
  INetworkTopology<string> & Record<string, unknown>
>('INetworkTopology', networkTopologySchema);
