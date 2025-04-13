import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import { createRuntimeConfiguration, GuidV4Provider } from '@digitaldefiance/ecies-lib';

/**
 * Creates fresh instances of test services to avoid shared state
 */
export function initializeTestServices() {
  // Configure to use 16-byte GUIDs following ecies-lib setup instructions
  const config = createRuntimeConfiguration({
    idProvider: new GuidV4Provider()
  });
  
  return {
    checksumService: new ChecksumService(),
    eciesService: new ECIESService(config),
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
  // Configure to use 16-byte GUIDs following ecies-lib setup instructions
  const config = createRuntimeConfiguration({
    idProvider: new GuidV4Provider()
  });
  return new ECIESService(config);
}
