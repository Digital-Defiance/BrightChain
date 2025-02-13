import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';
import { FecService } from './fec.service';
import { Pbkdf2Service } from './pbkdf2.service';
import { SealingService } from './sealing.service';
import { SymmetricService } from './symmetric.service';
import { TupleService } from './tuple.service';
import { VotingService } from './voting.service';

/**
 * ServiceProvider is a singleton that manages instances of all services.
 * This replaces the static helper classes with proper dependency injection.
 */
export class ServiceProvider {
  /**
   * Singleton instance of the service provider
   */
  private static instance: ServiceProvider | null = null;
  /**
   * Checksum service instance
   */
  private readonly checksumService: ChecksumService;
  /**
   * ECIES service instance
   */
  private readonly eciesService: ECIESService;
  /**
   * Tuple service instance
   */
  private readonly tupleService: TupleService;
  /**
   * Voting service instance
   */
  private readonly votingService: VotingService;
  /**
   * Sealing service instance
   */
  private readonly sealingService: SealingService;
  /**
   * Symmetric service instance
   */
  private readonly symmetricService: SymmetricService;
  /**
   * PBKDF2 service instance
   */
  private readonly pbkdf2Service: Pbkdf2Service;
  /**
   * FEC service instance
   */
  private readonly fecService: FecService;
  /**
   * CBL service instance
   */
  private readonly cblService: CBLService;

  private constructor() {
    this.checksumService = new ChecksumService();
    this.eciesService = new ECIESService();
    this.votingService = new VotingService();
    this.sealingService = new SealingService();
    this.symmetricService = new SymmetricService();
    this.pbkdf2Service = new Pbkdf2Service();
    this.fecService = new FecService();
    this.cblService = new CBLService(this.checksumService, this.eciesService);
    this.tupleService = new TupleService(this.checksumService, this.cblService);
  }

  /**
   * Get singleton instance of ServiceProvider
   * @returns ServiceProvider instance
   */
  public static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  /**
   * Get singleton instance of ChecksumService
   * @returns ChecksumService instance
   */
  public static getChecksumService(): ChecksumService {
    return ServiceProvider.getInstance().checksumService;
  }

  /**
   * Get singleton instance of ECIESService
   * @returns ECIESService instance
   */
  public static getECIESService(): ECIESService {
    return ServiceProvider.getInstance().eciesService;
  }

  /**
   * Get singleton instance of TupleService
   * @returns TupleService instance
   */
  public static getTupleService(): TupleService {
    return ServiceProvider.getInstance().tupleService;
  }

  /**
   * Get singleton instance of VotingService
   * @returns VotingService instance
   */
  public static getVotingService(): VotingService {
    return ServiceProvider.getInstance().votingService;
  }

  /**
   * Get singleton instance of SealingService
   * @returns SealingService instance
   */
  public static getSealingService(): SealingService {
    return ServiceProvider.getInstance().sealingService;
  }

  /**
   * Get singleton instance of SymmetricService
   * @returns SymmetricService instance
   */
  public static getSymmetricService(): SymmetricService {
    return ServiceProvider.getInstance().symmetricService;
  }

  /**
   * Get singleton instance of Pbkdf2Service
   * @returns Pbkdf2Service instance
   */
  public static getPbkdf2Service(): Pbkdf2Service {
    return ServiceProvider.getInstance().pbkdf2Service;
  }

  /**
   * Get singleton instance of FecService
   * @returns FecService instance
   */
  public static getFecService(): FecService {
    return ServiceProvider.getInstance().fecService;
  }

  /**
   * Get singleton instance of CBLService
   * @returns CBLService instance
   */
  public static getCBLService(): CBLService {
    return ServiceProvider.getInstance().cblService;
  }

  /**
   * For testing purposes - allows resetting the singleton instance
   * This should only be used in test files
   */
  public static resetInstance(): void {
    ServiceProvider.instance = null;
  }
}
