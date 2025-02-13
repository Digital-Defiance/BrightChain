import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';
import { ServiceProvider } from './service.provider';
import { TupleService } from './tuple.service';

describe('ServiceProvider', () => {
  beforeEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ServiceProvider.getInstance();
      const instance2 = ServiceProvider.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = ServiceProvider.getInstance();
      ServiceProvider.resetInstance();
      const instance2 = ServiceProvider.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Service Access', () => {
    it('should provide ChecksumService', () => {
      const service = ServiceProvider.getChecksumService();
      expect(service).toBeInstanceOf(ChecksumService);
    });

    it('should provide ECIESService', () => {
      const service = ServiceProvider.getECIESService();
      expect(service).toBeInstanceOf(ECIESService);
    });

    it('should provide TupleService', () => {
      const service = ServiceProvider.getTupleService();
      expect(service).toBeInstanceOf(TupleService);
    });

    it('should provide same service instances', () => {
      const checksumService1 = ServiceProvider.getChecksumService();
      const checksumService2 = ServiceProvider.getChecksumService();
      expect(checksumService1).toBe(checksumService2);

      const eciesService1 = ServiceProvider.getECIESService();
      const eciesService2 = ServiceProvider.getECIESService();
      expect(eciesService1).toBe(eciesService2);

      const tupleService1 = ServiceProvider.getTupleService();
      const tupleService2 = ServiceProvider.getTupleService();
      expect(tupleService1).toBe(tupleService2);
    });
  });

  describe('Service Functionality', () => {
    it('should provide working ChecksumService', () => {
      const service = ServiceProvider.getChecksumService();
      const data = Buffer.from('test data');
      const checksum = service.calculateChecksum(data);
      expect(checksum.length).toBe(service.checksumBufferLength);
    });

    it('should provide working ECIESService', () => {
      const service = ServiceProvider.getECIESService();
      const mnemonic = service.generateNewMnemonic();
      const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
      expect(wallet.getPrivateKey()).toBeDefined();
      expect(wallet.getPublicKey()).toBeDefined();
    });

    it('should provide working TupleService', () => {
      const service = ServiceProvider.getTupleService();
      const blockCount = service.getRandomBlockCount(1024);
      expect(blockCount).toBeGreaterThanOrEqual(
        service.getRandomBlockCount(1024),
      );
      expect(blockCount).toBeLessThanOrEqual(
        service.getRandomBlockCount(1024 * 1024),
      );
    });
  });
});
