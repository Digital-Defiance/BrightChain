import { GuidV4Uint8Array } from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from '../../blockMetadata';
import { NodeCapability } from '../../enumerations';
import { DataTemperature } from '../../enumerations/dataTemperature';
import { NodeStatus } from '../../enumerations/nodeStatus';
import { Checksum } from '../../types/checksum';
import { NodeConfig } from './nodeConfig';
import { NodeLocation } from './nodeLocation';
import { NodeResources } from './nodeResources';

/**
 * Core node interface
 */
export interface INode {
  // Identity
  id: GuidV4Uint8Array;
  publicKey: Buffer;
  version: string;

  // Status
  status: NodeStatus;
  capabilities: Set<NodeCapability>;
  location: NodeLocation;
  resources: NodeResources;
  config: NodeConfig;

  // Network operations
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  updateStatus(status: NodeStatus): Promise<void>;

  // Block operations
  hasBlock(id: Checksum): Promise<boolean>;
  getBlockMetadata(id: Checksum): Promise<BlockMetadata>;
  updateBlockTemperature(
    id: Checksum,
    temperature: DataTemperature,
  ): Promise<void>;

  // Node discovery
  findPeers(): Promise<INode[]>;
  getPeerInfo(peerId: GuidV4Uint8Array): Promise<INode | null>;

  // Health check
  getHealth(): Promise<{
    status: NodeStatus;
    timestamp: Date;
    metrics: {
      storage: number;
      bandwidth: number;
      uptime: number;
      peers: number;
    };
  }>;
}
