import { NodeIdSource } from '../../enumerations/nodeIdSource';
import { IDependencyStatus } from '../dependencyStatus';
import { INodeInfo } from '../nodeInfo';

/** A single Lumen client session visible to the admin dashboard. */
export interface IAdminClientSession {
  memberId: string;
  username: string;
  memberType: string;
  rooms: string[];
}

/** BrightTrust member summary for the dashboard. */
export interface IAdminBrightTrustMember {
  name: string;
  role?: string;
}

/** BrightTrust status summary. */
export interface IAdminBrightTrustStatus {
  active: boolean;
  memberCount: number;
  threshold: number;
  members: IAdminBrightTrustMember[];
}

/** Pool identity info. */
export interface IAdminPoolInfo {
  poolId: string;
  metadata?: Record<string, unknown>;
}

/** Database collection counts. */
export interface IAdminDbStats {
  users: number | null;
  roles: number | null;
  /** Breakdown of users by AccountStatus */
  usersByStatus: {
    active: number;
    locked: number;
    pendingEmailVerification: number;
  } | null;
  error?: string;
}

/** System-level process metrics. */
export interface IAdminSystemMetrics {
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number;
  externalBytes: number;
  uptimeSeconds: number;
  nodeVersion: string;
  appVersion: string;
}

/** Dependency health entry. */
export interface IAdminDependencyHealth {
  blockStore: IDependencyStatus;
  messageService: IDependencyStatus;
  webSocketServer: IDependencyStatus;
}

/** Block store summary statistics. */
export interface IAdminBlockStoreStats {
  totalBlocks: number;
  totalSizeBytes: number;
  countByDurability: Record<string, number>;
}

/** BrightHub summary statistics. */
export interface IAdminHubStats {
  totalPosts: number;
  activeUsersLast30Days: number;
}

/** BrightChat summary statistics. */
export interface IAdminChatStats {
  totalConversations: number;
  totalMessages: number;
}

/** BrightPass summary statistics. Vaults are opaque encrypted blobs — entry counts are unknowable server-side. */
export interface IAdminPassStats {
  totalVaults: number;
  sharedVaults: number;
}

/** BrightMail summary statistics. */
export interface IAdminMailStats {
  totalEmails: number;
  deliveryFailures: number;
  emailsLast24Hours: number;
}

/** Top-level dashboard data — the canonical shape shared by client and server. */
export interface IAdminDashboardData {
  // Requirement 2: Nodes
  nodes: INodeInfo[];
  localNodeId: string | null;
  /** Where the localNodeId came from — availability_service or environment fallback. */
  nodeIdSource: NodeIdSource;
  hostname: string;
  disconnectedPeers: string[];

  // Requirement 3: Lumen clients
  lumenClientCount: number;
  lumenClientSessions: IAdminClientSession[];

  // Requirement 4: Node-to-node connections
  nodeConnectionCount: number;
  connectedNodeIds: string[];

  // Requirement 5: System metrics
  system: IAdminSystemMetrics;

  // Requirement 6: Database stats
  db: IAdminDbStats;

  // Requirement 7: BrightTrust
  brightTrust: IAdminBrightTrustStatus;

  // Requirement 8: Pool & server identity
  pools: IAdminPoolInfo[];

  // Requirement 9: Dependency health
  dependencies: IAdminDependencyHealth;

  // Requirement 13: Block store stats
  blockStore: IAdminBlockStoreStats;

  // Requirement 14: BrightHub stats
  hub: IAdminHubStats;

  // Requirement 15: BrightChat stats
  chat: IAdminChatStats;

  // Requirement 16: BrightPass stats
  pass: IAdminPassStats;

  // Requirement 17: BrightMail stats
  mail: IAdminMailStats;

  // Audit ledger (optional — present when pool security is enabled)
  auditLedger?: {
    /** Number of entries in the audit ledger */
    length: number;
    /** Current Merkle root (hex string, first 32 chars) */
    merkleRoot: string | null;
    /** Whether the chain was validated successfully on startup */
    chainValid: boolean | null;
  };

  // Metadata
  timestamp: string;
}
