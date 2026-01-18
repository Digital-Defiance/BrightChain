/* eslint-disable @nx/enforce-module-boundaries */
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import type { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { ChecksumService } from '@brightchain/brightchain-lib/lib/services/checksum.service';
import { ServiceLocator } from '@brightchain/brightchain-lib/lib/services/serviceLocator';
import { BlockStoreService } from '../services/blockStore';

jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

beforeAll(() => {
  ServiceLocator.setServiceProvider({
    checksumService: new ChecksumService(),
  } as any);
});

afterAll(() => {
  ServiceLocator.reset();
});

const dummyApp = {
  id: 'test-app',
  getController: () => {
    throw new Error('not implemented');
  },
  getModel: () => {
    throw new Error('not implemented');
  },
  nodeAgent: {} as any,
  clusterAgentPublicKeys: [] as Buffer[],
};

describe('BlockStoreService', () => {
  const prevPath = process.env.BRIGHTCHAIN_BLOCKSTORE_PATH;
  const prevSize = process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES;

  afterEach(async () => {
    process.env.BRIGHTCHAIN_BLOCKSTORE_PATH = prevPath;
    process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES = prevSize;
  });

  it('stores and retrieves a block round-trip with checksum-derived id', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blockstore-'));
    process.env.BRIGHTCHAIN_BLOCKSTORE_PATH = tmpDir;
    const blockSize = 4096 as BlockSize;
    process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES = `${blockSize}`;

    const service = new BlockStoreService(dummyApp as any);
    const payload = Buffer.from('hello-world');

    const blockId = await service.storeBlock(payload);
    const stored = await service.getBlock(blockId);

    expect(stored.equals(payload)).toBe(true);

    // Verify the ID matches the checksum that the block class derives
    const expectedId = Buffer.from(new RawDataBlock(blockSize, payload).idChecksum.toBuffer()).toString('hex');
    expect(blockId).toBe(expectedId);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
