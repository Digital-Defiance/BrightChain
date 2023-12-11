import {
  ECIESService,
  PlatformID,
  TypedIdProviderWrapper,
  VotingService,
} from '@digitaldefiance/ecies-lib';
import type { BlockFactory } from '../factories/blockFactory';
import type { BlockCapacityCalculator } from '../services/blockCapacity.service';
import type { BlockService } from '../services/blockService';
import type { CBLService } from '../services/cblService';
import type { ChecksumService } from '../services/checksum.service';
import type { FecService } from '../services/fec.service';
import type { SealingService } from '../services/sealing.service';
import type { TupleService } from '../services/tuple.service';

/**
 * Interface for the ServiceProvider to break circular dependencies
 */
export interface IServiceProvider<TID extends PlatformID = Uint8Array> {
  readonly checksumService: ChecksumService;
  readonly blockFactory: BlockFactory<TID>;
  readonly eciesService: ECIESService<TID>;
  readonly cblService: CBLService<TID>;
  readonly blockService: BlockService<TID>;
  readonly blockCapacityCalculator: BlockCapacityCalculator<TID>;
  readonly sealingService: SealingService<TID>;
  readonly tupleService: TupleService<TID>;
  readonly votingService: VotingService;
  readonly fecService: FecService;
  readonly idProvider: TypedIdProviderWrapper<TID>;
}
