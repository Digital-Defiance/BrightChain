import type { InterfaceSchema } from '@digitaldefiance/branded-interface';
import { createBrandedInterface } from '@digitaldefiance/branded-interface';
import type { IBlockStoreStats } from '../../clientProtocol/blockStoreStats';

const blockStoreStatsSchema: InterfaceSchema = {
  totalCapacity: { type: 'number' },
  currentUsage: { type: 'number' },
  availableSpace: { type: 'number' },
  blockCounts: { type: 'object' },
  totalBlocks: { type: 'number' },
};

export const BlockStoreStatsDef = createBrandedInterface<
  IBlockStoreStats & Record<string, unknown>
>('IBlockStoreStats', blockStoreStatsSchema);
