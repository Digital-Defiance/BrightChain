import { GuidV4 } from '../guid';

export interface IClusterKeys {
  nodeAgents: GuidV4[];
  agentPublicKeys: Buffer[];
}
