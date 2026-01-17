/**
 * Owner Free Filesystem (OFF) Integration Test
 * 
 * This test demonstrates the complete BrightChain Owner Free Filesystem workflow:
 * 1. Take a real document (text/JSON data)
 * 2. Break it into ephemeral blocks
 * 3. "Whiten" blocks by XORing with random data
 * 4. Store the whitened blocks (which look random)
 * 5. Store the random blocks used for whitening
 * 6. Create a Constituent Block List (CBL) as the "recipe"
 * 7. Retrieve and reconstruct the original document
 * 
 * This implements the concept from the BrightChain writeup:
 * "Message M + Random cans A, B, C = Whitened Z"
 * "Throw away M, keep A, B, C, Z"
 * "To recover: A ^ B ^ C ^ Z = M"
 */

import { randomBytes } from 'crypto';
import { MemoryBlockStore } from '@brightchain/brightchain-lib/lib/stores/memoryBlockStore';
import { WhitenedBlock } from '@brightchain/brightchain-lib/lib/blocks/whitened';
import { RandomBlock } from '@brightchain/brightchain-lib/lib/blocks/random';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { ServiceLocator } from '@brightchain/brightchain-lib/lib/services/serviceLocator';
import { ServiceProvider } from '@brightchain/brightchain-lib/lib/services/service.provider';
import { uint8ArrayToHex } from '@digitaldefiance/ecies-lib';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn().mockResolvedValue({
    ext: 'bin',
    mime: 'application/octet-stream',
  }),
}));

describe('Owner Free Filesystem (OFF) Integration Tests', () => {
  let memoryStore: MemoryBlockStore;
  const blockSize = BlockSize.Small; // 256 bytes for testing

  beforeAll(() => {
    // Initialize ServiceLocator with checksumService
    const serviceProvider = ServiceProvider.getInstance();
    ServiceLocator.setServiceProvider(serviceProvider);
  });

  beforeEach(() => {
    memoryStore = new MemoryBlockStore(blockSize);
  });

  describe('Memory Block Store', () => {
    it('should store and retrieve raw blocks', async () => {
      const data = Buffer.from('Hello, BrightChain!');
      const checksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(data);
      
      await memoryStore.put(checksum, data);
      
      expect(await memoryStore.has(checksum)).toBe(true);
      const retrieved = await memoryStore.get(checksum);
      expect(retrieved.data.toString()).toBe('Hello, BrightChain!');
    });

    it('should reject oversized blocks', async () => {
      const oversizedData = randomBytes(blockSize + 1);
      const checksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(oversizedData);
      
      await expect(memoryStore.put(checksum, oversizedData)).rejects.toThrow();
    });

    it('should delete blocks', async () => {
      const data = Buffer.from('Temporary data');
      const checksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(data);
      
      await memoryStore.put(checksum, data);
      expect(await memoryStore.has(checksum)).toBe(true);
      
      await memoryStore.delete(checksum);
      expect(await memoryStore.has(checksum)).toBe(false);
    });
  });

  describe('Block Whitening (Owner Free Filesystem)', () => {
    it('should whiten a data block with random blocks', async () => {
      // Step 1: Create original message block (M)
      const originalMessage = Buffer.from('This is a secret message that should be obscured!');
      const paddedMessage = Buffer.alloc(blockSize);
      originalMessage.copy(paddedMessage);
      
      const messageChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(paddedMessage);
      const messageBlock = new RawDataBlock(blockSize, paddedMessage, new Date(), messageChecksum);
      
      // Step 2: Create random blocks (A, B, C)
      const randomBlock1 = RandomBlock.new(blockSize); // A
      const randomBlock2 = RandomBlock.new(blockSize); // B
      const randomBlock3 = RandomBlock.new(blockSize); // C
      
      // Step 3: XOR message with random blocks to create whitened block (Z)
      // M ^ A ^ B ^ C = Z
      let whitenedData = Buffer.from(messageBlock.data);
      
      for (const randomBlock of [randomBlock1, randomBlock2, randomBlock3]) {
        const randomData = Buffer.from(randomBlock.data);
        for (let i = 0; i < blockSize; i++) {
          whitenedData[i] ^= randomData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
      const whitenedBlock = new WhitenedBlock(blockSize, whitenedData, whitenedChecksum);
      
      // Step 4: Store all blocks (A, B, C, Z) in the memory store
      // Note: We throw away M (the original message)
      await memoryStore.put(randomBlock1.idChecksum, randomBlock1.data);
      await memoryStore.put(randomBlock2.idChecksum, randomBlock2.data);
      await memoryStore.put(randomBlock3.idChecksum, randomBlock3.data);
      await memoryStore.put(whitenedBlock.idChecksum, whitenedBlock.data);
      
      // Verify all blocks look random (whitened and random blocks)
      expect(whitenedBlock.data).not.toEqual(messageBlock.data);
      
      // Step 5: Retrieve blocks and reconstruct original message
      // A ^ B ^ C ^ Z = M
      const retrievedWhitened = await memoryStore.get(whitenedBlock.idChecksum);
      const retrievedRandom1 = await memoryStore.get(randomBlock1.idChecksum);
      const retrievedRandom2 = await memoryStore.get(randomBlock2.idChecksum);
      const retrievedRandom3 = await memoryStore.get(randomBlock3.idChecksum);
      
      let reconstructed = Buffer.from(retrievedWhitened.fullData);
      
      for (const retrieved of [retrievedRandom1, retrievedRandom2, retrievedRandom3]) {
        const randomData = Buffer.from(retrieved.fullData);
        for (let i = 0; i < blockSize; i++) {
          reconstructed[i] ^= randomData[i];
        }
      }
      
      // Step 6: Verify reconstruction matches original
      expect(reconstructed).toEqual(paddedMessage);
      expect(reconstructed.subarray(0, originalMessage.length).toString()).toBe('This is a secret message that should be obscured!');
    });

    it('should handle multi-block document whitening', async () => {
      // Create a larger document that spans multiple blocks
      const fullDocument = Buffer.from(JSON.stringify({
        title: 'BrightChain Technical Specification',
        version: '1.0',
        description: 'A revolutionary decentralized storage network using Owner Free Filesystem concepts',
        features: [
          'Data privacy through XOR whitening',
          'No single block contains meaningful data',
          'Distributed storage with redundancy',
          'Efficient deduplication',
        ],
        timestamp: new Date().toISOString(),
      }, null, 2));
      
      // Calculate how many blocks we need
      const blocksNeeded = Math.ceil(fullDocument.length / blockSize);
      const blocks: RawDataBlock[] = [];
      const randomBlockSets: RandomBlock[][] = [];
      const whitenedBlocks: WhitenedBlock[] = [];
      
      // Break document into blocks
      for (let i = 0; i < blocksNeeded; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, fullDocument.length);
        const chunk = Buffer.alloc(blockSize);
        fullDocument.copy(chunk, 0, start, end);
        
        const checksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(chunk);
        blocks.push(new RawDataBlock(blockSize, chunk, new Date(), checksum));
        
        // Create 3 random blocks for each message block
        const randoms = [
          RandomBlock.new(blockSize),
          RandomBlock.new(blockSize),
          RandomBlock.new(blockSize),
        ];
        randomBlockSets.push(randoms);
        
        // Whiten the block
        let whitenedData = Buffer.from(chunk);
        for (const randomBlock of randoms) {
          const randomData = Buffer.from(randomBlock.data);
          for (let j = 0; j < blockSize; j++) {
            whitenedData[j] ^= randomData[j];
          }
        }
        
        const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
        whitenedBlocks.push(new WhitenedBlock(blockSize, whitenedData, whitenedChecksum));
      }
      
      // Store all blocks (random and whitened) in memory store
      const recipe: string[] = []; // This is our CBL (Constituent Block List)
      
      for (let i = 0; i < whitenedBlocks.length; i++) {
        // Store random blocks
        for (const randomBlock of randomBlockSets[i]) {
          await memoryStore.put(randomBlock.idChecksum, randomBlock.data);
          recipe.push(uint8ArrayToHex(randomBlock.idChecksum));
        }
        
        // Store whitened block
        await memoryStore.put(whitenedBlocks[i].idChecksum, whitenedBlocks[i].data);
        recipe.push(uint8ArrayToHex(whitenedBlocks[i].idChecksum));
      }
      
      // Now reconstruct the document using only the recipe
      const reconstructedBlocks: Buffer[] = [];
      
      for (let i = 0; i < blocksNeeded; i++) {
        const recipeOffset = i * 4; // 3 randoms + 1 whitened per block
        const randomIds = recipe.slice(recipeOffset, recipeOffset + 3);
        const whitenedId = recipe[recipeOffset + 3];
        
        // Retrieve blocks
        const randomBlocks = await Promise.all(
          randomIds.map(id => memoryStore.get(id))
        );
        const whitenedBlock = await memoryStore.get(whitenedId);
        
        // XOR to reconstruct
        let reconstructed = Buffer.from(whitenedBlock.fullData);
        for (const randomBlock of randomBlocks) {
          const randomData = Buffer.from(randomBlock.fullData);
          for (let j = 0; j < blockSize; j++) {
            reconstructed[j] ^= randomData[j];
          }
        }
        
        reconstructedBlocks.push(reconstructed);
      }
      
      // Combine reconstructed blocks
      const reconstructedDocument = Buffer.concat(reconstructedBlocks).subarray(0, fullDocument.length);
      
      // Verify reconstruction
      expect(reconstructedDocument.toString()).toBe(fullDocument.toString());
      
      const parsedDoc = JSON.parse(reconstructedDocument.toString());
      expect(parsedDoc.title).toBe('BrightChain Technical Specification');
      expect(parsedDoc.features).toHaveLength(4);
    });

    it('should demonstrate that individual blocks are meaningless', async () => {
      const secretData = Buffer.from('TOP SECRET: Launch codes are 12345');
      const paddedSecret = Buffer.alloc(blockSize);
      secretData.copy(paddedSecret);
      
      const messageChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(paddedSecret);
      const messageBlock = new RawDataBlock(blockSize, paddedSecret, new Date(), messageChecksum);
      
      // Create whitening blocks
      const random1 = RandomBlock.new(blockSize);
      const random2 = RandomBlock.new(blockSize);
      
      // Whiten
      let whitenedData = Buffer.from(messageBlock.data);
      for (const randomBlock of [random1, random2]) {
        const randomData = Buffer.from(randomBlock.data);
        for (let i = 0; i < blockSize; i++) {
          whitenedData[i] ^= randomData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
      const whitenedBlock = new WhitenedBlock(blockSize, whitenedData, whitenedChecksum);
      
      // Store all blocks
      await memoryStore.put(random1.idChecksum, random1.data);
      await memoryStore.put(random2.idChecksum, random2.data);
      await memoryStore.put(whitenedBlock.idChecksum, whitenedBlock.data);
      
      // Demonstrate that NO single block or pair of blocks contains the secret
      expect(whitenedBlock.data.toString()).not.toContain('TOP SECRET');
      expect(whitenedBlock.data.toString()).not.toContain('12345');
      
      expect(random1.data.toString()).not.toContain('TOP SECRET');
      expect(random2.data.toString()).not.toContain('12345');
      
      // Even XORing whitened with just one random doesn't reveal it
      const partialXor = Buffer.from(whitenedBlock.data);
      const r1Data = Buffer.from(random1.data);
      for (let i = 0; i < blockSize; i++) {
        partialXor[i] ^= r1Data[i];
      }
      expect(partialXor.toString()).not.toContain('TOP SECRET');
      
      // But XORing all three DOES reveal the secret
      const fullXor = Buffer.from(whitenedBlock.data);
      for (const randomBlock of [random1, random2]) {
        const randomData = Buffer.from(randomBlock.data);
        for (let i = 0; i < blockSize; i++) {
          fullXor[i] ^= randomData[i];
        }
      }
      expect(fullXor.subarray(0, secretData.length).toString()).toBe('TOP SECRET: Launch codes are 12345');
    });
  });

  describe('BrightChain Writeup Examples', () => {
    it('should implement the "soup can" analogy from the writeup', async () => {
      // From the writeup:
      // "Message M + Random cans A, B, C = Resultant can Z"
      // "M ^ A ^ B ^ C = Z"
      // "We throw away M and keep A, B, C, Z"
      // "To get M back: A ^ B ^ C ^ Z = M"
      
      const M = Buffer.from('Secret Recipe for Alphabet Soup');
      const paddedM = Buffer.alloc(blockSize);
      M.copy(paddedM);
      
      // Random "cans/flavors" A, B, C
      const A = RandomBlock.new(blockSize);
      const B = RandomBlock.new(blockSize);
      const C = RandomBlock.new(blockSize);
      
      // Create Z by XORing M with A, B, C
      let Z = Buffer.from(paddedM);
      for (const can of [A, B, C]) {
        const canData = Buffer.from(can.data);
        for (let i = 0; i < blockSize; i++) {
          Z[i] ^= canData[i];
        }
      }
      
      const zChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(Z);
      const zBlock = new WhitenedBlock(blockSize, Z, zChecksum);
      
      // "Throw away M" (don't store it anywhere)
      // Store A, B, C, Z in the "soup market"
      await memoryStore.put(A.idChecksum, A.data);
      await memoryStore.put(B.idChecksum, B.data);
      await memoryStore.put(C.idChecksum, C.data);
      await memoryStore.put(zBlock.idChecksum, zBlock.data);
      
      // The recipe is just the list of can types: A, B, C, Z
      const recipe = [
        uint8ArrayToHex(A.idChecksum),
        uint8ArrayToHex(B.idChecksum),
        uint8ArrayToHex(C.idChecksum),
        uint8ArrayToHex(zBlock.idChecksum),
      ];
      
      // Anyone can ask for these cans from the market
      // But without knowing the recipe order, they can't reconstruct M
      
      // With the recipe, reconstruct M: A ^ B ^ C ^ Z = M
      const retrievedA = await memoryStore.get(recipe[0]);
      const retrievedB = await memoryStore.get(recipe[1]);
      const retrievedC = await memoryStore.get(recipe[2]);
      const retrievedZ = await memoryStore.get(recipe[3]);
      
      let reconstructedM = Buffer.from(retrievedZ.fullData);
      for (const retrieved of [retrievedA, retrievedB, retrievedC]) {
        const data = Buffer.from(retrieved.fullData);
        for (let i = 0; i < blockSize; i++) {
          reconstructedM[i] ^= data[i];
        }
      }
      
      expect(reconstructedM.subarray(0, M.length).toString()).toBe('Secret Recipe for Alphabet Soup');
    });
  });

  describe('Real-World Document Example', () => {
    it('should store and retrieve a JSON configuration file', async () => {
      const config = {
        application: 'BrightChain Node',
        version: '0.1.0',
        network: {
          port: 8080,
          host: 'localhost',
          protocol: 'https',
        },
        storage: {
          blockSize: 1024,
          replicationFactor: 3,
          durability: 'HIGH',
        },
        security: {
          encryption: 'ECIES',
          quorum: {
            members: 7,
            threshold: 4,
          },
        },
      };
      
      const configJson = Buffer.from(JSON.stringify(config, null, 2));
      const paddedConfig = Buffer.alloc(blockSize);
      configJson.copy(paddedConfig);
      
      // Whiten the config
      const randoms = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];
      
      let whitened = Buffer.from(paddedConfig);
      for (const random of randoms) {
        const randomData = Buffer.from(random.data);
        for (let i = 0; i < blockSize; i++) {
          whitened[i] ^= randomData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitened);
      const whitenedBlock = new WhitenedBlock(blockSize, whitened, whitenedChecksum);
      
      // Store blocks
      for (const random of randoms) {
        await memoryStore.put(random.idChecksum, random.data);
      }
      await memoryStore.put(whitenedBlock.idChecksum, whitenedBlock.data);
      
      // Create CBL-like recipe (magnet link format)
      const recipe = [
        ...randoms.map(r => uint8ArrayToHex(r.idChecksum)),
        uint8ArrayToHex(whitenedBlock.idChecksum),
      ];
      const magnetLink = `brightchain://block?recipe=${recipe.join('+')}`;
      
      // Simulate retrieving via magnet link
      const blockIds = magnetLink.split('recipe=')[1].split('+');
      const retrievedBlocks = await Promise.all(
        blockIds.map(id => memoryStore.get(id))
      );
      
      // Last block is whitened, rest are randoms
      const whitenedData = retrievedBlocks[retrievedBlocks.length - 1].fullData;
      const randomDatas = retrievedBlocks.slice(0, -1).map(b => b.fullData);
      
      let reconstructed = Buffer.from(whitenedData);
      for (const randomData of randomDatas) {
        for (let i = 0; i < blockSize; i++) {
          reconstructed[i] ^= randomData[i];
        }
      }
      
      const recoveredConfig = JSON.parse(reconstructed.subarray(0, configJson.length).toString());
      
      expect(recoveredConfig).toEqual(config);
      expect(recoveredConfig.network.port).toBe(8080);
      expect(recoveredConfig.security.quorum.threshold).toBe(4);
    });
  });
});
