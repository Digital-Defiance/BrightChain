import { BlockCapacityCalculator } from './blockCapacity.service';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';
import { TupleService } from './tuple.service';
import { VotingService } from './voting.service';

/**
 * Service provider for dependency injection
 */
export class ServiceProvider {
  private static instance: ServiceProvider | undefined;
  public readonly checksumService: ChecksumService;
  public readonly eciesService: ECIESService;
  public readonly cblService: CBLService;
  public readonly blockCapacityCalculator: BlockCapacityCalculator;
  public readonly tupleService: TupleService;
  public readonly votingService: VotingService;

  constructor() {
    if (ServiceProvider.instance) {
      throw new Error('Use ServiceProvider.getInstance() instead of new.');
    }
    ServiceProvider.instance = this;
    this.checksumService = new ChecksumService();
    this.eciesService = new ECIESService();
    this.cblService = new CBLService(this.checksumService, this.eciesService);
    this.blockCapacityCalculator = new BlockCapacityCalculator(
      this.cblService,
      this.eciesService,
    );
    this.tupleService = new TupleService(this.checksumService, this.cblService);
    this.votingService = new VotingService(this.eciesService);
  }
  public static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }
  public static resetInstance(): void {
    ServiceProvider.instance = undefined;
  }
}
