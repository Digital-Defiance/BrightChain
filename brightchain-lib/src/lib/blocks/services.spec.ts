import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '../services/ecies.service';
import { TupleService } from '../services/tuple.service';
import { BlockServices } from './services';

describe('BlockServices', () => {
  let mockChecksumService: ChecksumService;
  let mockEciesService: ECIESService;
  let mockTupleService: TupleService;

  beforeEach(() => {
    // Reset services before each test
    BlockServices.setChecksumService(undefined);
    BlockServices.setECIESService(undefined);
    BlockServices.setTupleService(undefined);

    // Create mock services
    mockChecksumService = new ChecksumService();
    mockEciesService = new ECIESService();
    mockTupleService = new TupleService(mockChecksumService);
  });

  describe('ChecksumService', () => {
    it('should create new ChecksumService if none set', () => {
      const service = BlockServices.getChecksumService();
      expect(service).toBeInstanceOf(ChecksumService);
    });

    it('should return set ChecksumService', () => {
      BlockServices.setChecksumService(mockChecksumService);
      const service = BlockServices.getChecksumService();
      expect(service).toBe(mockChecksumService);
    });

    it('should calculate checksum using service', () => {
      BlockServices.setChecksumService(mockChecksumService);
      const testData = Buffer.from('test data');
      const service = BlockServices.getChecksumService();
      const checksum = service.calculateChecksum(testData);
      expect(checksum).toBeDefined();
      expect(checksum.length).toBe(service.checksumBufferLength);
    });
  });

  describe('ECIESService', () => {
    it('should create new ECIESService if none set', () => {
      const service = BlockServices.getECIESService();
      expect(service).toBeInstanceOf(ECIESService);
    });

    it('should return set ECIESService', () => {
      BlockServices.setECIESService(mockEciesService);
      const service = BlockServices.getECIESService();
      expect(service).toBe(mockEciesService);
    });
  });

  describe('TupleService', () => {
    it('should create new TupleService if none set', () => {
      const service = BlockServices.getTupleService();
      expect(service).toBeInstanceOf(TupleService);
    });

    it('should return set TupleService', () => {
      BlockServices.setTupleService(mockTupleService);
      const service = BlockServices.getTupleService();
      expect(service).toBe(mockTupleService);
    });

    it('should recreate TupleService when ChecksumService changes', () => {
      // Set initial TupleService
      BlockServices.setTupleService(mockTupleService);
      const initialService = BlockServices.getTupleService();
      expect(initialService).toBe(mockTupleService);

      // Change ChecksumService
      const newChecksumService = new ChecksumService();
      BlockServices.setChecksumService(newChecksumService);

      // TupleService should be recreated with new ChecksumService
      const newService = BlockServices.getTupleService();
      expect(newService).not.toBe(initialService);
      expect(newService).toBeInstanceOf(TupleService);
    });
  });
});
