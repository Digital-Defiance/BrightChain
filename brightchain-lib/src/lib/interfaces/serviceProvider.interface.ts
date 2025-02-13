import { BlockCapacityCalculator } from '../services/blockCapacity.service';
import { BlockService } from '../services/blockService';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
import { CrcService } from '../services/crc.service';
import { ECIESService } from '../services/ecies.service';
import { FecService } from '../services/fec.service';
import { TupleService } from '../services/tuple.service';
import { VotingService } from '../services/voting.service';

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
