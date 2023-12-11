import {
  BlockStoreService,
  IBrightChainApplication,
} from '@brightchain/brightchain-api-lib';
import {
  BlockSize,
  ChecksumService,
  lengthToClosestBlockSize,
  MemoryBlockStore,
  RawDataBlock,
  ServiceLocator,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';

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
    const blockSize = BlockSize.Small;
    const memoryStore = new MemoryBlockStore([...validBlockSizes]);

    // Create a mock app with a memory-backed block store
    const mockApp = {
      id: 'test-app',
      environment: {
        blockStoreBlockSize: blockSize,
      },
      services: new Map([['blockStore', memoryStore]]),
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

    // Verify the ID matches the checksum that the block class derives.
    // storeBlock resolves to the closest block size for the payload length,
    // which for 11 bytes is BlockSize.Message (512).
    const resolvedSize = lengthToClosestBlockSize(payload.length);
    const expectedId = Buffer.from(
      new RawDataBlock(resolvedSize, payload).idChecksum.toBuffer(),
    ).toString('hex');
    expect(blockId).toBe(expectedId);
  });
});
