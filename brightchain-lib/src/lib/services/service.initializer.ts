import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';

/**
 * Service initializer to avoid circular dependencies
 * This class only holds references to services and doesn't import ServiceProvider
 */
export class ServiceInitializer {
  private static checksumService: ChecksumService;
  private static eciesService: ECIESService;

  public static setChecksumService(service: ChecksumService): void {
    ServiceInitializer.checksumService = service;
  }

  public static setECIESService(service: ECIESService): void {
    ServiceInitializer.eciesService = service;
  }

  public static getChecksumService(): ChecksumService {
    if (!ServiceInitializer.checksumService) {
      throw new Error('ChecksumService not initialized');
    }
    return ServiceInitializer.checksumService;
  }

  public static getECIESService(): ECIESService {
    if (!ServiceInitializer.eciesService) {
      throw new Error('ECIESService not initialized');
    }
    return ServiceInitializer.eciesService;
  }
}
