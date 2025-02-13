import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';
import { TupleService } from './tuple.service';

/**
 * ServiceProvider is a singleton that manages instances of all services.
 * This replaces the static helper classes with proper dependency injection.
 */
export class ServiceProvider {
  private static instance: ServiceProvider | null = null;
  private readonly checksumService: ChecksumService;
  private readonly eciesService: ECIESService;
  private readonly tupleService: TupleService;

  private constructor() {
    this.checksumService = new ChecksumService();
    this.eciesService = new ECIESService();
    this.tupleService = new TupleService(this.checksumService);
  }

  public static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  public static getChecksumService(): ChecksumService {
    return ServiceProvider.getInstance().checksumService;
  }

  public static getECIESService(): ECIESService {
    return ServiceProvider.getInstance().eciesService;
  }

  public static getTupleService(): TupleService {
    return ServiceProvider.getInstance().tupleService;
  }

  /**
   * For testing purposes - allows resetting the singleton instance
   * This should only be used in test files
   */
  public static resetInstance(): void {
    ServiceProvider.instance = null;
  }
}
