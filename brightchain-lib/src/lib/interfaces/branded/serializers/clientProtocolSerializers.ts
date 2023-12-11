/**
 * @fileoverview Interface serializers for client protocol branded interface definitions.
 *
 * One InterfaceSerializer per client protocol branded interface, created via
 * interfaceSerializer(). Each serializer handles JSON round-tripping of branded
 * instances — serialize() strips Symbol metadata, deserialize() validates and
 * re-brands the parsed data.
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { interfaceSerializer } from '@digitaldefiance/branded-interface';

// Primitives must be imported (registered) before definitions that ref them
import '../primitives/blockId';
import '../primitives/emailString';
import '../primitives/iso8601Timestamp';
import '../primitives/poolId';
import '../primitives/shortHexGuid';

import {
  BlockStoreStatsDef,
  ClientEventDef,
  EnergyAccountStatusDef,
  NetworkTopologyDef,
  NodeStatusDef,
  PeerInfoDef,
  PoolAclSummaryDef,
  PoolDetailDef,
  PoolInfoDef,
} from '../clientProtocol/index';

export const nodeStatusSerializer = interfaceSerializer(NodeStatusDef);
export const peerInfoSerializer = interfaceSerializer(PeerInfoDef);
export const networkTopologySerializer =
  interfaceSerializer(NetworkTopologyDef);
export const poolAclSummarySerializer = interfaceSerializer(PoolAclSummaryDef);
export const poolInfoSerializer = interfaceSerializer(PoolInfoDef);
export const poolDetailSerializer = interfaceSerializer(PoolDetailDef);
export const energyAccountStatusSerializer = interfaceSerializer(
  EnergyAccountStatusDef,
);
export const blockStoreStatsSerializer =
  interfaceSerializer(BlockStoreStatsDef);
export const clientEventSerializer = interfaceSerializer(ClientEventDef);
