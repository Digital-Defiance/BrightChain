import type { AxiosInstance } from 'axios';
import { HttpSyncApiClient } from '../adapters/http-sync-api-client';

function createMockAxios(): jest.Mocked<AxiosInstance> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaults: {} as any,
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    getUri: jest.fn(),
    postForm: jest.fn(),
    putForm: jest.fn(),
    patchForm: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>;
}

describe('HttpSyncApiClient', () => {
  let client: HttpSyncApiClient;
  let mockAxios: jest.Mocked<AxiosInstance>;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    mockAxios = createMockAxios();
    client = new HttpSyncApiClient(mockAxios, baseUrl);
  });

  it('should fetch remote changes with correct params', async () => {
    const since = new Date('2024-01-01');
    mockAxios.get.mockResolvedValue({ data: [] });

    const result = await client.getRemoteChanges('user-1', since);

    expect(mockAxios.get).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/sync/changes`,
      { params: { userId: 'user-1', since: since.toISOString() } },
    );
    expect(result).toEqual([]);
  });

  it('should propagate local change via POST', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });
    const event = {
      eventId: 'e1',
      eventType: 'modified',
      localPath: '/test.txt',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.propagateLocalChange(event as any);

    expect(mockAxios.post).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/sync/events`,
      event,
    );
  });

  it('should upload file via PUT with correct URL', async () => {
    await expect(
      client.uploadFile('file-1', '/nonexistent-path-xyz'),
    ).rejects.toThrow('File not found');
  });

  it('should download file content as Uint8Array', async () => {
    const mockData = new ArrayBuffer(5);
    new Uint8Array(mockData).set([72, 101, 108, 108, 111]);
    mockAxios.get.mockResolvedValue({ data: mockData });

    const result = await client.downloadFileContent('file-1');

    expect(mockAxios.get).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/files/file-1`,
      { responseType: 'arraybuffer' },
    );
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
  });

  it('should upload file content via PUT', async () => {
    mockAxios.put.mockResolvedValue({ data: {} });
    const content = new Uint8Array([1, 2, 3]);

    await client.uploadFileContent('file-1', content);

    expect(mockAxios.put).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/sync/upload/file-1`,
      expect.any(Buffer),
      { headers: { 'Content-Type': 'application/octet-stream' } },
    );
  });

  it('should list folder contents', async () => {
    const entries = [
      {
        id: 'f1',
        name: 'doc.txt',
        isDirectory: false,
        sizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockAxios.get.mockResolvedValue({ data: entries });

    const result = await client.listFolder('folder-1');

    expect(mockAxios.get).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/folders/folder-1/contents`,
    );
    expect(result).toEqual(entries);
  });

  it('should list root folder contents', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });

    await client.listRootFolder('user-1');

    expect(mockAxios.get).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/folders/root/contents`,
      { params: { userId: 'user-1' } },
    );
  });

  it('should create remote folder', async () => {
    mockAxios.post.mockResolvedValue({ data: { id: 'new-id' } });

    const result = await client.createRemoteFolder('parent-1', 'New Folder');

    expect(mockAxios.post).toHaveBeenCalledWith(`${baseUrl}/burnbag/folders`, {
      parentFolderId: 'parent-1',
      name: 'New Folder',
    });
    expect(result).toBe('new-id');
  });

  it('should delete remote file', async () => {
    mockAxios.delete.mockResolvedValue({ data: {} });

    await client.deleteRemoteEntry('file-1', false);

    expect(mockAxios.delete).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/files/file-1`,
    );
  });

  it('should delete remote folder', async () => {
    mockAxios.delete.mockResolvedValue({ data: {} });

    await client.deleteRemoteEntry('folder-1', true);

    expect(mockAxios.delete).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/folders/folder-1`,
    );
  });

  it('should rename remote entry', async () => {
    mockAxios.patch.mockResolvedValue({ data: {} });

    await client.renameRemoteEntry('file-1', 'new-name.txt');

    expect(mockAxios.patch).toHaveBeenCalledWith(
      `${baseUrl}/burnbag/files/file-1/metadata`,
      { fileName: 'new-name.txt' },
    );
  });
});
