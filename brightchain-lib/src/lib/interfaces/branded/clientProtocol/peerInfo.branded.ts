import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IPeerInfo } from '../../clientProtocol/peerInfo';

const peerInfoSchema: InterfaceSchema = {
  nodeId: { type: 'string' },
  connected: { type: 'boolean' },
  lastSeen: { type: 'string' },
  latencyMs: { type: 'number', optional: true },
};

export const PeerInfoDef = createBrandedInterface<
  IPeerInfo<string> & Record<string, unknown>
>('IPeerInfo', peerInfoSchema);
