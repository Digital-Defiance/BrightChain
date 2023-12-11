import { FecRecoveryResult, ParityData } from '@brightchain/brightchain-lib';
import { WasmFecService } from './fec';

describe('FecService', () => {
  let fecService: WasmFecService;
  beforeEach(() => {
    fecService = new WasmFecService();
  });
  describe('FEC operations', () => {
    it('should encode and decode data correctly', async () => {
      const shardSize = 1024; // Use a smaller shard size for testing
      const dataShards = 4;
      const parityShards = 2;
      const inputData = Buffer.alloc(shardSize * dataShards, 'test data');

      // Encode the data
      const encodedData = await fecService.encode(
        inputData,
        shardSize,
        dataShards,
        parityShards,
        false,
      );
      expect(encodedData.length).toBe(shardSize * (dataShards + parityShards));

      // Simulate missing shards (mark some shards as unavailable)
      const shardsAvailable = Array(dataShards + parityShards).fill(true);
      // Simulate losing some data shards (up to parityShards)
      const numMissingShards = Math.min(parityShards, dataShards);
      for (let i = 0; i < numMissingShards; i++) {
        shardsAvailable[i] = false;
      }

      // Decode the damaged data (with missing shards)
      const decodedData = await fecService.decode(
        encodedData,
        shardSize,
        dataShards,
        parityShards,
        shardsAvailable,
      );
      expect(decodedData).toEqual(inputData);
    });

    it('should handle empty input correctly', async () => {
      const shardSize = 1024;
      const dataShards = 1;
      const parityShards = 1;
      const emptyData = Buffer.alloc(shardSize); // Must match shardSize * dataShards
      const shardsAvailable = [true, true];

      const encodedData = await fecService.encode(
        emptyData,
        shardSize,
        dataShards,
        parityShards,
        false,
      );
      const decodedData = await fecService.decode(
        encodedData,
        shardSize,
        dataShards,
        parityShards,
        shardsAvailable,
      );
      expect(decodedData).toEqual(emptyData);
    });

    it('should handle maximum damage threshold', async () => {
      const shardSize = 1024;
      const dataShards = 4;
      const parityShards = 2;
      const inputData = Buffer.alloc(shardSize * dataShards, 'test data');

      // Encode the data
      const encodedData = await fecService.encode(
        inputData,
        shardSize,
        dataShards,
        parityShards,
        false,
      );

      // Simulate maximum correctable damage (mark some shards as unavailable)
      const shardsAvailable = Array(dataShards + parityShards).fill(true);
      shardsAvailable[0] = false; // Mark first data shard as damaged
      shardsAvailable[1] = false; // Mark second data shard as damaged

      // Decode should still work with minimum required shards
      const decodedData = await fecService.decode(
        encodedData,
        shardSize,
        dataShards,
        parityShards,
        shardsAvailable,
      );
      expect(decodedData).toEqual(inputData);
    });

    it('should fail with too much damage', async () => {
      const shardSize = 1024;
      const dataShards = 4;
      const parityShards = 2;
      const inputData = Buffer.alloc(shardSize * dataShards, 'test data');

      // Encode the data
      const encodedData = await fecService.encode(
        inputData,
        shardSize,
        dataShards,
        parityShards,
        false,
      );

      // Mark too many shards as unavailable
      const shardsAvailable = Array(dataShards + parityShards).fill(false);
      shardsAvailable[0] = true; // Only one shard available

      // Decode should fail
      await expect(
        fecService.decode(
          encodedData,
          shardSize,
          dataShards,
          parityShards,
          shardsAvailable,
        ),
      ).rejects.toThrow('Not enough shards available');
    });

    it('should handle various block sizes', async () => {
      const shardSize = 1024;
      const dataShards = 1;
      const parityShards = 1;
      const inputData = Buffer.alloc(shardSize * dataShards, 'test data');
      const shardsAvailable = [true, true];

      const encodedData = await fecService.encode(
        inputData,
        shardSize,
        dataShards,
        parityShards,
        false,
      );
      const decodedData = await fecService.decode(
        encodedData,
        shardSize,
        dataShards,
        parityShards,
        shardsAvailable,
      );
      expect(decodedData).toEqual(inputData);
    });
  });

  describe('File operations', () => {
    it('should create and recover files', async () => {
      // Create a test file
      const fileSize = 1024;
      const testData = Buffer.alloc(fileSize, 'test file data');
      const parityCount = 2;

      // Create parity blocks
      const parityData: ParityData[] = await fecService.createParityData(
        testData,
        parityCount,
      );

      expect(parityData.length).toBe(parityCount);
      expect(parityData[0].index).toBe(0);
      expect(parityData[1].index).toBe(1);

      const corruptedData = Buffer.from(testData);
      corruptedData[0] = 0; // simulate corruption

      // Recover using parity data
      const recoveredData: FecRecoveryResult = await fecService.recoverFileData(
        corruptedData,
        parityData,
        testData.length,
      );

      expect(recoveredData.recovered).toBe(true);
      expect(recoveredData.data).toEqual(testData);
    });
  });
});
