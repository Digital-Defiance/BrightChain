import { GuidV4Uint8Array } from '@digitaldefiance/ecies-lib';
import { NodeCapability, NodeStatus } from '../../enumerations';

/**
 * Node advertisement for discovery.
 *
 * Uses Uint8Array for browser compatibility (Requirement 18.6).
 */
export interface NodeAdvertisement {
  id: GuidV4Uint8Array;
  publicKey: Uint8Array;
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
