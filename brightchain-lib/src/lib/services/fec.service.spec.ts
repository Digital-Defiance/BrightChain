import { BaseBlock } from '../blocks/base';
import BlockDataType from '../enumerations/blockDataType';
import BlockType from '../enumerations/blockType';
import { FecService } from './fec.service';
import { ServiceProvider } from './service.provider';

describe('FecService', () => {
  let fecService: FecService;
  beforeEach(() => {
    fecService = ServiceProvider.getInstance().fecService;
  });
  describe('FEC operations', () => {
    it('should encode and decode data correctly', async () => {
      const shardSize = 1024; // Use a smaller shard size for testing
      const dataShards = 4;
      const parityShards = 2;
      const inputData = new Uint8Array(shardSize * dataShards);
      inputData.fill(116); // 't' character code
      const inputBuffer = Buffer.from(inputData);

      // Encode the data
      const encodedData = await fecService.encode(
        inputBuffer,
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
      expect(decodedData).toEqual(inputBuffer);
    });

    it('should handle empty input correctly', async () => {
      const shardSize = 1024;
      const dataShards = 1;
      const parityShards = 1;
      const emptyData = new Uint8Array(shardSize); // Must match shardSize * dataShards
      const emptyBuffer = Buffer.from(emptyData);
      const shardsAvailable = [true, true];

      const encodedData = await fecService.encode(
        emptyBuffer,
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
      expect(decodedData).toEqual(emptyBuffer);
    });

    it('should handle maximum damage threshold', async () => {
      const shardSize = 1024;
      const dataShards = 4;
      const parityShards = 2;
      const inputData = new Uint8Array(shardSize * dataShards);
      inputData.fill(116); // 't' character code
      const inputBuffer = Buffer.from(inputData);

      // Encode the data
      const encodedData = await fecService.encode(
        inputBuffer,
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
      expect(decodedData).toEqual(inputBuffer);
    });

    it('should fail with too much damage', async () => {
      const shardSize = 1024;
      const dataShards = 4;
      const parityShards = 2;
      const inputData = new Uint8Array(shardSize * dataShards);
      inputData.fill(116); // 't' character code
      const inputBuffer = Buffer.from(inputData);

      // Encode the data
      const encodedData = await fecService.encode(
        inputBuffer,
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
      const inputData = new Uint8Array(shardSize * dataShards);
      inputData.fill(116); // 't' character code
      const inputBuffer = Buffer.from(inputData);
      const shardsAvailable = [true, true];

      const encodedData = await fecService.encode(
        inputBuffer,
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
      expect(decodedData).toEqual(inputBuffer);
    });
  });

  describe('Block operations', () => {
    it('should create and recover blocks', async () => {
      // Create a test block
      const blockSize = 1024;
      const testData = new Uint8Array(blockSize);
      testData.fill(116); // 't' character code
      const testBuffer = Buffer.from(testData);
      const parityCount = 2;

      // Create parity blocks
      const parityBlocks = await fecService.createParityBlocks(
        {
          blockSize,
          data: testBuffer,
          blockType: BlockType.RawData,
          blockDataType: BlockDataType.RawData,
          canRead: true,
          canPersist: true,
        } as unknown as BaseBlock,
        parityCount,
      );

      expect(parityBlocks.length).toBe(parityCount);
      expect(parityBlocks[0].blockSize).toBe(blockSize);

      // Recover using parity blocks
      const recoveredBlock =
        await ServiceProvider.getInstance().fecService.recoverDataBlocks(
          {
            blockSize,
            data: testBuffer,
            blockType: BlockType.RawData,
            blockDataType: BlockDataType.RawData,
            canRead: true,
            canPersist: true,
          } as unknown as BaseBlock,
          parityBlocks,
        );

      expect(recoveredBlock.blockSize).toBe(blockSize);
      expect(recoveredBlock.data).toEqual(testBuffer);
    });
  });
});
