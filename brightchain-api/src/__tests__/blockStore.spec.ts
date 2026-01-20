import {
  BlockStoreService,
  IBrightChainApplication,
} from '@brightchain/brightchain-api-lib';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import type { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { ChecksumService } from '@brightchain/brightchain-lib/lib/services/checksum.service';
import { ServiceLocator } from '@brightchain/brightchain-lib/lib/services/serviceLocator';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

beforeAll(() => {
  ServiceLocator.setServiceProvider({
    checksumService: new ChecksumService(),
  } as unknown as ReturnType<typeof ServiceLocator.getServiceProvider>);
});

afterAll(() => {
  ServiceLocator.reset();
});

describe('BlockStoreService', () => {
  const prevPath = process.env.BRIGHTCHAIN_BLOCKSTORE_PATH;
  const prevSize = process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES;

  afterEach(async () => {
    process.env.BRIGHTCHAIN_BLOCKSTORE_PATH = prevPath;
    process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES = prevSize;
  });

  it('stores and retrieves a block round-trip with checksum-derived id', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blockstore-'));
    const blockSize = 4096 as BlockSize;

    // Create a mock app with proper environment that returns the temp directory
    const mockApp = {
      id: 'test-app',
      environment: {
        blockStorePath: tmpDir,
        blockStoreBlockSize: blockSize,
      },
      getController: () => {
        throw new Error('not implemented');
      },
      setController: () => {},
      getModel: () => {
        throw new Error('not implemented');
      },
      nodeAgent: {},
      clusterAgentPublicKeys: [],
    };

    const service = new BlockStoreService(
      mockApp as unknown as IBrightChainApplication<PlatformID>,
    );
    const payload = Buffer.from('hello-world');

    const blockId = await service.storeBlock(payload);
    const stored = await service.getBlock(blockId);

    expect(stored.equals(payload)).toBe(true);

    // Verify the ID matches the checksum that the block class derives
    const expectedId = Buffer.from(
      new RawDataBlock(blockSize, payload).idChecksum.toBuffer(),
    ).toString('hex');
    expect(blockId).toBe(expectedId);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
