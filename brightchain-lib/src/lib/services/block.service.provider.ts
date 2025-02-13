import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';
import { ServiceProvider } from './service.provider';

/**
 * Service provider specifically for block services to avoid circular dependencies
 */
export class BlockServiceProvider {
  private static checksumService: ChecksumService;
  private static eciesService: ECIESService;

  public static getChecksumService(): ChecksumService {
    if (!BlockServiceProvider.checksumService) {
      BlockServiceProvider.checksumService =
        ServiceProvider.getChecksumService();
    }
    return BlockServiceProvider.checksumService;
  }

  public static getECIESService(): ECIESService {
    if (!BlockServiceProvider.eciesService) {
      BlockServiceProvider.eciesService = ServiceProvider.getECIESService();
    }
    return BlockServiceProvider.eciesService;
  }
}
