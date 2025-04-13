import { BlockCapacityCalculator } from '../services/blockCapacity.service';
import { BlockService } from '../services/blockService';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
import { CrcService } from '../services/crc.service';
import { ECIESService, VotingService } from '@digitaldefiance/node-ecies-lib';
import { FecService } from '../services/fec.service';
import { TupleService } from '../services/tuple.service';

/**
 * Interface for the ServiceProvider to break circular dependencies
 */
export interface IServiceProvider {
  readonly checksumService: ChecksumService;
  readonly crcService: CrcService;
  readonly eciesService: ECIESService;
  readonly cblService: CBLService;
  readonly blockService: BlockService;
  readonly blockCapacityCalculator: BlockCapacityCalculator;
  readonly tupleService: TupleService;
  readonly votingService: VotingService;
  readonly fecService: FecService;
}
