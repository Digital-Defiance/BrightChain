import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '../services/ecies.service';

/**
 * Creates fresh instances of test services to avoid shared state
 */
export function initializeTestServices() {
  return {
    checksumService: new ChecksumService(),
    eciesService: new ECIESService(),
  };
}

/**
 * Gets a new instance of ChecksumService
 */
export function getChecksumService(): ChecksumService {
  return new ChecksumService();
}

/**
 * Gets a new instance of ECIESService
 */
export function getEciesService(): ECIESService {
  return new ECIESService();
}
