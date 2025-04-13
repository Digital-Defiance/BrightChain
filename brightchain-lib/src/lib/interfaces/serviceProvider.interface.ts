import {
  ECIESService,
  PlatformID,
  VotingService,
} from '@digitaldefiance/ecies-lib';
import { SealingService } from '../services';
import { BlockCapacityCalculator } from '../services/blockCapacity.service';
import { BlockService } from '../services/blockService';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
import { FecService } from '../services/fec.service';
import { TupleService } from '../services/tuple.service';

/**
 * Interface for the ServiceProvider to break circular dependencies
 */
export interface IServiceProvider<TID extends PlatformID = Uint8Array> {
  readonly checksumService: ChecksumService;
  readonly eciesService: ECIESService<TID>;
  readonly cblService: CBLService<TID>;
  readonly blockService: BlockService<TID>;
  readonly blockCapacityCalculator: BlockCapacityCalculator<TID>;
  readonly sealingService: SealingService<TID>;
  readonly tupleService: TupleService<TID>;
  readonly votingService: VotingService;
  readonly fecService: FecService;
}
