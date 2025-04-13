import { GuidV4 } from '@digitaldefiance/ecies-lib';

export interface IClusterKeys {
  nodeAgents: GuidV4[];
  agentPublicKeys: Buffer[];
}
