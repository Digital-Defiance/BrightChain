import { ChecksumService } from './checksum.service';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
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
      const service = ServiceProvider.getInstance().checksumService;
      expect(service).toBeInstanceOf(ChecksumService);
    });

    it('should provide ECIESService', () => {
      const service = ServiceProvider.getInstance().eciesService;
      expect(service).toBeInstanceOf(ECIESService);
    });

    it('should provide TupleService', () => {
      const service = ServiceProvider.getInstance().tupleService;
      expect(service).toBeInstanceOf(TupleService);
    });

    it('should provide same service instances', () => {
      const checksumService1 = ServiceProvider.getInstance().checksumService;
      const checksumService2 = ServiceProvider.getInstance().checksumService;
      expect(checksumService1).toBe(checksumService2);

      const eciesService1 = ServiceProvider.getInstance().eciesService;
      const eciesService2 = ServiceProvider.getInstance().eciesService;
      expect(eciesService1).toBe(eciesService2);

      const tupleService1 = ServiceProvider.getInstance().tupleService;
      const tupleService2 = ServiceProvider.getInstance().tupleService;
      expect(tupleService1).toBe(tupleService2);
    });
  });

  describe('Service Functionality', () => {
    it('should provide working ChecksumService', () => {
      const service = ServiceProvider.getInstance().checksumService;
      const data = Buffer.from('test data');
      const checksum = service.calculateChecksum(data);
      expect(checksum.length).toBe(service.checksumBufferLength);
    });

    it('should provide working ECIESService', () => {
      const service = ServiceProvider.getInstance().eciesService;
      const mnemonic = service.generateNewMnemonic();
      const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
      expect(wallet.getPrivateKey()).toBeDefined();
      expect(wallet.getPublicKey()).toBeDefined();
    });

    it('should provide working TupleService', () => {
      const service = ServiceProvider.getInstance().tupleService;
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
