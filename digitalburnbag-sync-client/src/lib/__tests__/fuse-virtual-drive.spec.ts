import type {
  ISyncApiClient,
  ISyncConfig,
} from '@brightchain/digitalburnbag-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FuseVirtualDrive } from '../adapters/fuse-virtual-drive';

function makeConfig(mountPath: string): ISyncConfig<string> {
  return {
    userId: 'test-user',
    apiBaseUrl: 'https://api.example.com',
    mountPath,
    selectiveSyncFolderIds: [],
    pollIntervalMs: 30000,
    maxCacheSizeBytes: 1024 * 1024 * 1024,
    encryptLocalCache: false,
    offlineModeEnabled: true,
    maxConcurrentSyncs: 4,
  };
}

function createMockApiClient(): jest.Mocked<ISyncApiClient<string>> {
  return {
    getRemoteChanges: jest.fn().mockResolvedValue([]),
    downloadFile: jest.fn().mockResolvedValue(undefined),
    downloadFileContent: jest
      .fn()
      .mockResolvedValue(new Uint8Array([72, 101, 108, 108, 111])),
    uploadFile: jest.fn().mockResolvedValue(undefined),
    uploadFileContent: jest.fn().mockResolvedValue(undefined),
    propagateLocalChange: jest.fn().mockResolvedValue(undefined),
    listFolder: jest.fn().mockResolvedValue([]),
    listRootFolder: jest.fn().mockResolvedValue([]),
    createRemoteFolder: jest.fn().mockResolvedValue('new-folder-id'),
    deleteRemoteEntry: jest.fn().mockResolvedValue(undefined),
    renameRemoteEntry: jest.fn().mockResolvedValue(undefined),
  };
}

describe('FuseVirtualDrive', () => {
  let drive: FuseVirtualDrive;
  let apiClient: jest.Mocked<ISyncApiClient<string>>;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'burnbag-fuse-'));
    apiClient = createMockApiClient();
    drive = new FuseVirtualDrive(apiClient);
  });

  afterEach(async () => {
    if (drive.isMounted()) {
      await drive.unmount();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should not be mounted initially', () => {
    expect(drive.isMounted()).toBe(false);
  });

  it('should mount in mirror mode (FUSE not available in test)', async () => {
    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));

    expect(drive.isMounted()).toBe(true);
    expect(drive.getMountPath()).toBe(mountPath);
    expect(fs.existsSync(mountPath)).toBe(true);
  });

  it('should fetch root folder contents on mount', async () => {
    apiClient.listRootFolder.mockResolvedValue([
      {
        id: 'f1',
        name: 'docs',
        isDirectory: true,
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'f2',
        name: 'readme.txt',
        isDirectory: false,
        sizeBytes: 100,
        mimeType: 'text/plain',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));

    expect(apiClient.listRootFolder).toHaveBeenCalledWith('test-user');
  });

  it('should unmount cleanly', async () => {
    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));
    await drive.unmount();

    expect(drive.isMounted()).toBe(false);
  });

  it('should be idempotent on double mount', async () => {
    const mountPath = path.join(tmpDir, 'mount');
    const config = makeConfig(mountPath);
    await drive.mount(config);
    await drive.mount(config);
    expect(drive.isMounted()).toBe(true);
  });

  it('should be idempotent on double unmount', async () => {
    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));
    await drive.unmount();
    await drive.unmount();
    expect(drive.isMounted()).toBe(false);
  });

  it('should hydrate file via downloadFileContent', async () => {
    apiClient.listRootFolder.mockResolvedValue([
      {
        id: 'file-123',
        name: 'test.txt',
        isDirectory: false,
        sizeBytes: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));
    await drive.hydrateFile('test.txt', 'file-123');

    expect(apiClient.downloadFileContent).toHaveBeenCalledWith('file-123');
  });

  it('should dehydrate file in mirror mode by truncating and creating sidecar', async () => {
    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));

    const filePath = path.join(mountPath, 'to-dehydrate.txt');
    fs.writeFileSync(filePath, 'some content here');

    await drive.dehydrateFile('to-dehydrate.txt');

    const stat = fs.statSync(filePath);
    expect(stat.size).toBe(0);

    const sidecar = filePath + '.cloudmeta';
    expect(fs.existsSync(sidecar)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(sidecar, 'utf-8'));
    expect(meta.originalSize).toBe(17);
  });

  it('should refresh cache from remote API', async () => {
    apiClient.listRootFolder.mockResolvedValue([
      {
        id: 'd1',
        name: 'Documents',
        isDirectory: true,
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const mountPath = path.join(tmpDir, 'mount');
    await drive.mount(makeConfig(mountPath));

    // Second call with updated data
    apiClient.listRootFolder.mockResolvedValue([
      {
        id: 'd1',
        name: 'Documents',
        isDirectory: true,
        sizeBytes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'f1',
        name: 'new-file.txt',
        isDirectory: false,
        sizeBytes: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await drive.refreshCache();
    expect(apiClient.listRootFolder).toHaveBeenCalledTimes(2);
  });
});
