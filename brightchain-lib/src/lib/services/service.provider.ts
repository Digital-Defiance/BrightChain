import { IServiceProvider } from '../interfaces/serviceProvider.interface';
import { BlockCapacityCalculator } from './blockCapacity.service';
import { BlockService } from './blockService';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { CrcService } from './crc.service';
import { ECIESService } from './ecies.service';
import { FecService } from './fec.service';
import { ServiceLocator } from './serviceLocator';
import { TupleService } from './tuple.service';
import { VotingService } from './voting.service';

/**
 * Service provider for dependency injection
 */
export class ServiceProvider implements IServiceProvider {
  private static instance: ServiceProvider | undefined;
  public readonly checksumService: ChecksumService;
  public readonly crcService: CrcService;
  public readonly eciesService: ECIESService;
  public readonly cblService: CBLService;
  public readonly blockService: BlockService;
  public readonly blockCapacityCalculator: BlockCapacityCalculator;
  public readonly tupleService: TupleService;
  public readonly votingService: VotingService;
  public readonly fecService: FecService;

  constructor() {
    if (ServiceProvider.instance) {
      throw new Error('Use ServiceProvider.getInstance() instead of new.');
    }
    ServiceProvider.instance = this;
    this.checksumService = new ChecksumService();
    this.crcService = new CrcService();
    this.eciesService = new ECIESService();
    this.blockService = new BlockService();
    this.cblService = new CBLService(this.checksumService, this.eciesService);
    this.blockCapacityCalculator = new BlockCapacityCalculator(
      this.cblService,
      this.eciesService,
    );
    // Inject BlockService into TupleService
    this.tupleService = new TupleService(
      this.checksumService,
      this.cblService,
      this.blockService,
    );
    this.votingService = new VotingService(this.eciesService);
    this.fecService = new FecService();

    // Register with ServiceLocator
    ServiceLocator.setServiceProvider(this);
  }

  public static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  public static resetInstance(): void {
    ServiceProvider.instance = undefined;
    ServiceLocator.reset();
  }
}
