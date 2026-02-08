import { GuidV4Uint8Array } from '@digitaldefiance/ecies-lib';
import { NodeCapability, NodeStatus } from '../../enumerations';

/**
 * Node advertisement for discovery
 */
export interface NodeAdvertisement {
  id: GuidV4Uint8Array;
  publicKey: Buffer;
  status: NodeStatus;
  capabilities: NodeCapability[];
  location: {
    region: string;
    country: string;
  };
  endpoints: {
    http: string;
    ws: string;
  };
  version: string;
  timestamp: Date;
}
