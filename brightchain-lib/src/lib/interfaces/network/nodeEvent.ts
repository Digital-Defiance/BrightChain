import { GuidV4Uint8Array } from '@digitaldefiance/ecies-lib';
import { NodeEventType } from '../../enumerations';

/**
 * Node event
 */
export interface NodeEvent<T = unknown> {
  type: NodeEventType;
  nodeId: GuidV4Uint8Array;
  timestamp: Date;
  data: T;
}
