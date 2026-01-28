import {
  ECIESService,
  getEciesI18nEngine,
  getEnhancedIdProvider,
  getRuntimeConfiguration,
  PlatformID,
  TypedIdProviderWrapper,
  VotingService,
} from '@digitaldefiance/ecies-lib';

import { BRIGHTCHAIN_CONFIG_KEY } from '../config/constants';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { BlockFactory } from '../factories/blockFactory';
import { IServiceProvider } from '../interfaces/serviceProvider.interface';
import { BlockCapacityCalculator } from './blockCapacity.service';
import { BlockService } from './blockService';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { FecService } from './fec.service';
import { SealingService } from './sealing.service';
import { ServiceLocator } from './serviceLocator';
import { TupleService } from './tuple.service';

/**
 * Service provider for dependency injection
 */
export class ServiceProvider<
  TID extends PlatformID = Uint8Array,
> implements IServiceProvider<TID> {
  private static instance: ServiceProvider<PlatformID> | undefined;
  public readonly idProvider: TypedIdProviderWrapper<TID>;
  public readonly checksumService: ChecksumService;
  public readonly blockFactory: BlockFactory<TID>;
  public readonly eciesService: ECIESService<TID>;
  public readonly cblService: CBLService<TID>;
  public readonly blockService: BlockService<TID>;
  public readonly blockCapacityCalculator: BlockCapacityCalculator<TID>;
  public readonly tupleService: TupleService<TID>;
  public readonly sealingService: SealingService<TID>;
  public readonly votingService: VotingService;
  public readonly fecService: FecService;

  constructor() {
    if (ServiceProvider.instance) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_ServiceProvider_UseSingletonInstance,
      );
    }
    ServiceProvider.instance = this;

    // Initialize ECIES i18n
    getEciesI18nEngine();

    // Use the BrightChain configuration (auto-initializes if needed)
    const eciesConfig = getRuntimeConfiguration(BRIGHTCHAIN_CONFIG_KEY);

    this.checksumService = new ChecksumService();
    this.blockFactory = new BlockFactory<TID>(this.checksumService);
    this.eciesService = new ECIESService<TID>(eciesConfig);
    this.blockService = new BlockService<TID>();
    // Use getEnhancedIdProvider to get a properly wrapped TypedIdProviderWrapper with generateTyped() support
    this.idProvider = getEnhancedIdProvider<TID>(BRIGHTCHAIN_CONFIG_KEY);
    this.sealingService = new SealingService<TID>(
      this.eciesService,
      this.idProvider,
    );
    this.cblService = new CBLService<TID>(
      this.checksumService,
      this.eciesService,
      this.idProvider,
    );
    this.blockCapacityCalculator = new BlockCapacityCalculator<TID>(
      this.cblService,
      this.eciesService,
    );
    this.tupleService = new TupleService<TID>(
      this.checksumService,
      this.cblService,
    );
    this.votingService = VotingService.getInstance();
    this.fecService = new FecService();

    // Register with ServiceLocator
    ServiceLocator.setServiceProvider(this);
  }

  public static getInstance<
    TID extends PlatformID = Uint8Array,
  >(): ServiceProvider<TID> {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider<TID>();
    }
    return ServiceProvider.instance as ServiceProvider<TID>;
  }

  public static resetInstance(): void {
    ServiceProvider.instance = undefined;
    ServiceLocator.reset();
  }
}
