import { ECIESService } from '@digitaldefiance/ecies-lib';
import { initializeBrightChain } from '../init';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';

/**
 * Initializes test services using the BrightChain configuration.
 * This ensures all services use the same ID provider (GuidV4Provider with 16-byte IDs).
 */
export function initializeTestServices() {
  // Initialize BrightChain to set up the proper configuration
  initializeBrightChain();

  const serviceProvider = ServiceProvider.getInstance();

  return {
    checksumService: serviceProvider.checksumService,
    eciesService: serviceProvider.eciesService,
  };
}

/**
 * Gets a new instance of ChecksumService
 */
export function getChecksumService(): ChecksumService {
  return ServiceProvider.getInstance().checksumService;
}

/**
 * Gets a new instance of ECIESService
 */
export function getEciesService(): ECIESService {
  return ServiceProvider.getInstance().eciesService;
}
