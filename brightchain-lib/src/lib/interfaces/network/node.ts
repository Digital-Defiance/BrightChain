import { GuidV4 } from '@digitaldefiance/ecies-lib';
import { BlockMetadata } from '../../blockMetadata';
import { DataTemperature } from '../../enumerations/dataTemperature';
import { ChecksumUint8Array } from '../../types';

/**
 * Node capabilities in the BrightChain network
 */
export enum NodeCapability {
  STORAGE = 'storage', // Can store blocks
  ROUTING = 'routing', // Can route requests
  QUORUM = 'quorum', // Can participate in quorum
  BOOTSTRAP = 'bootstrap', // Can act as bootstrap node
  METADATA = 'metadata', // Can store metadata
  TEMPERATURE = 'temperature', // Can track temperature
}

/**
 * Node status in the network
 */
export enum NodeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
  MAINTENANCE = 'maintenance',
  SHUTDOWN_SCHEDULED = 'shutdown_scheduled',
}

/**
 * Node location information
 */
export interface NodeLocation {
  region: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  verificationMethod: 'OPERATOR' | 'IP' | 'LATENCY';
  lastVerified: Date;
}

/**
 * Node resource metrics
 */
export interface NodeResources {
  storage: {
    total: number; // Total storage in bytes
    available: number; // Available storage in bytes
    reserved: number; // Reserved for pending operations
  };
  bandwidth: {
    up: number; // Upload bandwidth in bytes/sec
    down: number; // Download bandwidth in bytes/sec
    latency: number; // Average latency in ms
  };
  reliability: {
    uptime: number; // Uptime percentage
    successRate: number; // Operation success rate
  };
}

/**
 * Node configuration
 */
export interface NodeConfig {
  httpPort: number;
  wsPort: number;
  upnpEnabled: boolean;
  discoveryInterval: number;
  syncInterval: number;
  maxConnections: number;
  minStorageSpace: number;
  bootstrapNodes: string[];
}

/**
 * Core node interface
 */
export interface INode {
  // Identity
  id: GuidV4;
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
  hasBlock(id: ChecksumUint8Array): Promise<boolean>;
  getBlockMetadata(id: ChecksumUint8Array): Promise<BlockMetadata>;
  updateBlockTemperature(
    id: ChecksumUint8Array,
    temperature: DataTemperature,
  ): Promise<void>;

  // Node discovery
  findPeers(): Promise<INode[]>;
  getPeerInfo(peerId: GuidV4): Promise<INode | null>;

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

/**
 * Node advertisement for discovery
 */
export interface NodeAdvertisement {
  id: GuidV4;
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

/**
 * Node event types
 */
export enum NodeEventType {
  STATUS_CHANGE = 'node:status',
  PEER_CONNECT = 'node:peer:connect',
  PEER_DISCONNECT = 'node:peer:disconnect',
  BLOCK_TEMPERATURE = 'node:block:temperature',
  BLOCK_LOCATION = 'node:block:location',
  SYNC_START = 'node:sync:start',
  SYNC_COMPLETE = 'node:sync:complete',
}

/**
 * Node event
 */
export interface NodeEvent<T = unknown> {
  type: NodeEventType;
  nodeId: GuidV4;
  timestamp: Date;
  data: T;
}
