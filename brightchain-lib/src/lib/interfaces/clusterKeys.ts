import { GuidV4Uint8Array } from '@digitaldefiance/ecies-lib';

/**
 * Cluster key configuration for distributed node management
 *
 * @remarks
 * This interface defines the keys and identifiers for nodes participating
 * in a BrightChain cluster. Each node agent has a corresponding public key
 * for secure communication.
 *
 * @example
 * ```typescript
 * const clusterKeys: IClusterKeys = {
 *   nodeAgents: [guid1, guid2, guid3],
 *   agentPublicKeys: [key1Buffer, key2Buffer, key3Buffer]
 * };
 * ```
 */
export interface IClusterKeys {
  /** Array of unique identifiers for each node agent in the cluster */
  nodeAgents: GuidV4Uint8Array[];

  /** Array of public keys corresponding to each node agent (same order as nodeAgents) */
  agentPublicKeys: Buffer[];
}
