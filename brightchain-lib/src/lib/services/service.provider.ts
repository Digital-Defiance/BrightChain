import {
  createRuntimeConfiguration,
  GuidV4Provider,
} from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  getNodeEciesI18nEngine,
  VotingService,
} from '@digitaldefiance/node-ecies-lib';
import { IServiceProvider } from '../interfaces/serviceProvider.interface';
import { BlockCapacityCalculator } from './blockCapacity.service';
import { BlockService } from './blockService';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { CrcService } from './crc.service';
import { FecService } from './fec.service';
import { ServiceLocator } from './serviceLocator';
import { TupleService } from './tuple.service';

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

    // Initialize ECIES i18n
    getNodeEciesI18nEngine();

    // Configure to use 16-byte GUIDs following ecies-lib setup instructions
    const eciesConfig = createRuntimeConfiguration({
      idProvider: new GuidV4Provider(),
    });

    this.checksumService = new ChecksumService();
    this.crcService = new CrcService();
    this.eciesService = new ECIESService(eciesConfig);
    this.blockService = new BlockService();
    this.cblService = new CBLService(this.checksumService, this.eciesService);
    this.blockCapacityCalculator = new BlockCapacityCalculator(
      this.cblService,
      this.eciesService,
    );
    this.tupleService = new TupleService(this.checksumService, this.cblService);
    this.votingService = VotingService.getInstance();
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
