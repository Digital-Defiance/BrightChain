import type { ECIESService, PlatformID } from '@digitaldefiance/ecies-lib';
import type { BlockCapacityCalculator } from '../../services/blockCapacity.service';
import type { BlockService } from '../../services/blockService';
import type { ChecksumService } from '../../services/checksum.service';

/**
 * Services required by ephemeral blocks.
 * Used for dependency injection to avoid circular dependencies.
 */
export interface IEphemeralBlockServices<TID extends PlatformID = Uint8Array> {
  checksumService: ChecksumService;
  blockCapacityCalculator: BlockCapacityCalculator<TID>;
  eciesService: ECIESService<TID>;
  blockService: BlockService<TID>;
}
