/**
 * Unit tests for ApiClient.
 *
 * Validates HTTP request method, auth header injection, retry logic
 * (5xx exponential backoff, 429 Retry-After, 401 delegation), and
 * all public API methods.
 */

import { ApiClient, ApiError } from '../../api/api-client';
import type { AuthManager } from '../../auth/auth-manager';
import type { SettingsManager } from '../../services/settings-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSettings(apiHostUrl = 'https://brightchain.org'): SettingsManager {
  return { apiHostUrl } as unknown as SettingsManager;
}

function mockAuth(token: string | null = 'test-jwt-token'): AuthManager & {
  handleUnauthorized: jest.Mock;
  getToken: jest.Mock;
} {
  return {
    getToken: jest.fn(async () => token),
    handleUnauthorized: jest.fn(async () => undefined),
  } as unknown as AuthManager & {
    handleUnauthorized: jest.Mock;
    getToken: jest.Mock;
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  const h = new Headers(headers);
  if (!h.has('Content-Type')) {
    h.set('Content-Type', 'application/json');
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: h,
    json: async () => body,
    text: async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Response;
}

function binaryResponse(data: Uint8Array, status = 200): Response {
  return {
    ok: true,
    status,
    statusText: 'OK',
    headers: new Headers(),
    arrayBuffer: async () =>
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    text: async () => '',
    json: async () => ({}),
  } as unknown as Response;
}

function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    headers: new Headers(),
    json: async () => undefined,
    text: async () => '',
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApiClient', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({}));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('request - auth header injection', () => {
    it('should add Authorization header when token exists', async () => {
      const auth = mockAuth('my-jwt');
      const client = new ApiClient(mockSettings(), auth);
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await client.getFileMetadata('file-1');

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer my-jwt');
    });

    it('should not add Authorization header when token is null', async () => {
      const auth = mockAuth(null);
      const client = new ApiClient(mockSettings(), auth);
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await client.getFileMetadata('file-1');

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });
  });

  describe('request - URL building', () => {
    it('should build URL from settings.apiHostUrl + path', async () => {
      const client = new ApiClient(
        mockSettings('https://api.example.com'),
        mockAuth(),
      );
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));

      await client.getFileMetadata('abc');

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.example.com/files/abc/metadata');
    });

    it('should append query parameters', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ results: [], totalCount: 0 }),
      );

      await client.searchFiles('test', { mimeType: 'text/plain' });

      const [url] = fetchSpy.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('test');
      expect(parsed.searchParams.get('mimeType')).toBe('text/plain');
    });
  });

  describe('request - 401 handling', () => {
    it('should call auth.handleUnauthorized on 401 and throw', async () => {
      const auth = mockAuth();
      const client = new ApiClient(mockSettings(), auth);
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ error: 'Unauthorized' }, 401),
      );

      await expect(client.getFileMetadata('file-1')).rejects.toThrow(ApiError);
      expect(auth.handleUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 401', async () => {
      const auth = mockAuth();
      const client = new ApiClient(mockSettings(), auth);
      fetchSpy.mockResolvedValue(jsonResponse({}, 401));

      await expect(client.getFileMetadata('file-1')).rejects.toThrow(
        'Unauthorized',
      );
      // Only one fetch call — no retries
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('request - 5xx exponential backoff', () => {
    it('should retry up to 2 times on 5xx with exponential backoff', async () => {
      const auth = mockAuth();
      const client = new ApiClient(mockSettings(), auth, 10);
      // Stub delay to avoid real waits
      jest.spyOn(client, 'delay').mockResolvedValue(undefined);

      fetchSpy
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 502))
        .mockResolvedValueOnce(jsonResponse({}, 503));

      await expect(client.getFileMetadata('f')).rejects.toThrow(ApiError);
      // 1 initial + 2 retries = 3 calls
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should succeed if a retry succeeds', async () => {
      const client = new ApiClient(mockSettings(), mockAuth(), 10);
      jest.spyOn(client, 'delay').mockResolvedValue(undefined);

      fetchSpy
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({ id: 'ok' }));

      const result = await client.getFileMetadata('f');
      expect(result).toEqual({ id: 'ok' });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff delays', async () => {
      const client = new ApiClient(mockSettings(), mockAuth(), 100);
      const delaySpy = jest.spyOn(client, 'delay').mockResolvedValue(undefined);

      fetchSpy
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500));

      await expect(client.getFileMetadata('f')).rejects.toThrow();
      // attempt 0 → delay 100*2^0=100, attempt 1 → delay 100*2^1=200
      expect(delaySpy).toHaveBeenCalledTimes(2);
      expect(delaySpy).toHaveBeenNthCalledWith(1, 100);
      expect(delaySpy).toHaveBeenNthCalledWith(2, 200);
    });
  });

  describe('request - 429 rate limit', () => {
    it('should wait for Retry-After header and retry', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const delaySpy = jest.spyOn(client, 'delay').mockResolvedValue(undefined);

      fetchSpy
        .mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '2' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'ok' }));

      const result = await client.getFileMetadata('f');
      expect(result).toEqual({ id: 'ok' });
      expect(delaySpy).toHaveBeenCalledWith(2000);
    });
  });

  describe('request - network errors', () => {
    it('should throw ApiError with statusCode 0 on network failure', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(client.getFileMetadata('f')).rejects.toThrow(
        expect.objectContaining({
          name: 'ApiError',
          statusCode: 0,
          message: expect.stringContaining('ECONNREFUSED'),
        }),
      );
    });
  });

  describe('request - non-retryable errors', () => {
    it('should throw immediately on 4xx (non-401, non-429)', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'Not Found' }, 404));

      await expect(client.getFileMetadata('f')).rejects.toThrow(ApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Public method tests
  // -------------------------------------------------------------------------

  describe('getFileContent', () => {
    it('should return Uint8Array from binary response', async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const client = new ApiClient(mockSettings(), mockAuth());
      fetchSpy.mockResolvedValueOnce(binaryResponse(data));

      const result = await client.getFileContent('file-1');
      expect(result).toEqual(data);
    });
  });

  describe('deleteFile', () => {
    it('should send DELETE and handle 204', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      fetchSpy.mockResolvedValueOnce(noContentResponse());

      await expect(client.deleteFile('file-1')).resolves.toBeUndefined();
      const [, init] = fetchSpy.mock.calls[0];
      expect(init.method).toBe('DELETE');
    });
  });

  describe('createFolder', () => {
    it('should POST with parentFolderId and name', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const folder = { id: 'new-folder', name: 'My Folder' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(folder));

      const result = await client.createFolder('parent-1', 'My Folder');
      expect(result).toEqual(folder);

      const [, init] = fetchSpy.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        parentFolderId: 'parent-1',
        name: 'My Folder',
      });
    });
  });

  describe('uploadChunk', () => {
    it('should send binary data with checksum header and higher retry limit', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const chunk = new Uint8Array([10, 20, 30]);
      const receipt = { chunksReceived: 1, totalChunks: 3 };
      fetchSpy.mockResolvedValueOnce(jsonResponse(receipt));

      const result = await client.uploadChunk('session-1', 0, chunk, 'abc123');
      expect(result).toEqual(receipt);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/upload/session-1/chunk/0');
      expect(init.headers['X-Chunk-Checksum']).toBe('abc123');
      expect(init.body).toBe(chunk);
    });

    it('should retry chunk uploads up to 3 times on 5xx', async () => {
      const client = new ApiClient(mockSettings(), mockAuth(), 10);
      jest.spyOn(client, 'delay').mockResolvedValue(undefined);

      fetchSpy
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500))
        .mockResolvedValueOnce(jsonResponse({}, 500));

      const chunk = new Uint8Array([1]);
      await expect(client.uploadChunk('s', 0, chunk, 'x')).rejects.toThrow(
        ApiError,
      );
      // 1 initial + 3 retries = 4 calls
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('searchFiles', () => {
    it('should pass query and filters as URL params', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const results = { results: [], totalCount: 0 };
      fetchSpy.mockResolvedValueOnce(jsonResponse(results));

      await client.searchFiles('hello', { folderId: 'f1' });

      const [url] = fetchSpy.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('hello');
      expect(parsed.searchParams.get('folderId')).toBe('f1');
    });
  });

  describe('auth endpoints (IAuthApiDelegate)', () => {
    it('directChallenge should POST to /api/user/direct-challenge', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const loginResp = {
        token: 'jwt',
        user: { id: 'u1' },
        serverPublicKey: 'pk',
      };
      fetchSpy.mockResolvedValueOnce(jsonResponse(loginResp));

      const payload = { challenge: 'aabb', signature: 'ccdd' };
      const result = await client.directChallenge(payload);
      expect(result).toEqual(loginResp);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/user/direct-challenge');
      expect(init.method).toBe('POST');
    });

    it('passwordLogin should POST to /api/user/login', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const loginResp = {
        token: 'jwt',
        user: { id: 'u1' },
        serverPublicKey: 'pk',
      };
      fetchSpy.mockResolvedValueOnce(jsonResponse(loginResp));

      const result = await client.passwordLogin('user1', 'pass');
      expect(result).toEqual(loginResp);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/user/login');
      expect(JSON.parse(init.body)).toEqual({
        username: 'user1',
        password: 'pass',
      });
    });
  });

  describe('version operations', () => {
    it('getVersions should GET /files/{fileId}/versions', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const versions = [{ id: 'v1', versionNumber: 1 }];
      fetchSpy.mockResolvedValueOnce(jsonResponse(versions));

      const result = await client.getVersions('file-1');
      expect(result).toEqual(versions);
    });

    it('restoreVersion should POST to restore endpoint', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const meta = { id: 'file-1', fileName: 'test.txt' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(meta));

      const result = await client.restoreVersion('file-1', 'v2');
      expect(result).toEqual(meta);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/files/file-1/versions/v2/restore');
      expect(init.method).toBe('POST');
    });
  });

  describe('folder operations', () => {
    it('getFolderContents should GET /folders/{id}/contents', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const contents = { files: [], folders: [] };
      fetchSpy.mockResolvedValueOnce(jsonResponse(contents));

      const result = await client.getFolderContents('folder-1');
      expect(result).toEqual(contents);
    });

    it('moveItem should POST to /folders/{id}/move', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      fetchSpy.mockResolvedValueOnce(noContentResponse());

      await client.moveItem('item-1', 'new-parent');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toContain('/folders/item-1/move');
      expect(JSON.parse(init.body)).toEqual({
        newParentFolderId: 'new-parent',
      });
    });
  });

  describe('upload flow', () => {
    it('initUpload should POST to /upload/init', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const session = { sessionId: 's1', chunkSize: 1024, totalChunks: 5 };
      fetchSpy.mockResolvedValueOnce(jsonResponse(session));

      const result = await client.initUpload({
        fileName: 'test.txt',
        fileSize: 5120,
        mimeType: 'text/plain',
        targetFolderId: 'f1',
      });
      expect(result).toEqual(session);
    });

    it('finalizeUpload should POST to /upload/{sessionId}/finalize', async () => {
      const client = new ApiClient(mockSettings(), mockAuth());
      const meta = { id: 'file-1', fileName: 'test.txt' };
      fetchSpy.mockResolvedValueOnce(jsonResponse(meta));

      const result = await client.finalizeUpload('s1');
      expect(result).toEqual(meta);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/upload/s1/finalize');
    });
  });
});
