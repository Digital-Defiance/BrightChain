/**
 * Feature: brightchain-vfs-explorer, Property 21: Write operations fire onDidChangeFile events
 *
 * For any file operation (writeFile, delete, createDirectory), the FSProvider
 * should fire the correct `onDidChangeFile` event type (Changed, Deleted,
 * Created respectively).
 *
 * **Validates: Requirements 6.9**
 */

import fc from 'fast-check';
import { FileChangeType } from 'vscode';
import type { ApiClient } from '../../api/api-client';
import { BrightchainFSProvider } from '../../providers/fs-provider';
import { MetadataCache } from '../../services/metadata-cache';
import { toFileUri, toFolderUri } from '../../util/uri';

/** Valid file name arbitrary (non-empty, no slashes, URI-safe). */
const validFileName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => !s.includes('/') && s.trim().length > 0)
  .filter((s) => {
    try {
      return decodeURIComponent(encodeURIComponent(s)) === s;
    } catch {
      return false;
    }
  });

/**
 * Helper: create a mock ApiClient that resolves all write operations.
 */
function createMockApi(): ApiClient {
  return {
    initUpload: jest.fn().mockResolvedValue({
      sessionId: 'session-1',
      chunkSize: 1024,
      totalChunks: 1,
    }),
    uploadChunk: jest
      .fn()
      .mockResolvedValue({ chunksReceived: 1, totalChunks: 1 }),
    finalizeUpload: jest.fn().mockResolvedValue({}),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    createFolder: jest.fn().mockResolvedValue({}),
  } as unknown as ApiClient;
}

describe('Property 21: Write operations fire onDidChangeFile events', () => {
  it('writeFile fires a Changed event', () => {
    fc.assert(
      fc.asyncProperty(fc.uuid(), validFileName, async (fileId, fileName) => {
        const cache = new MetadataCache(0);
        const mockApi = createMockApi();
        const provider = new BrightchainFSProvider(mockApi, cache);

        const events: { type: FileChangeType }[] = [];
        provider.onDidChangeFile((e) => events.push(...e));

        const uri = toFileUri(fileId, fileName);
        const content = new Uint8Array([1, 2, 3]);

        await provider.writeFile(uri, content, {
          create: true,
          overwrite: true,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events.some((e) => e.type === FileChangeType.Changed)).toBe(
          true,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('delete fires a Deleted event', () => {
    fc.assert(
      fc.asyncProperty(fc.uuid(), validFileName, async (fileId, fileName) => {
        const cache = new MetadataCache(0);
        const mockApi = createMockApi();
        const provider = new BrightchainFSProvider(mockApi, cache);

        const events: { type: FileChangeType }[] = [];
        provider.onDidChangeFile((e) => events.push(...e));

        const uri = toFileUri(fileId, fileName);

        await provider.delete(uri, { recursive: false });

        expect(events.length).toBe(1);
        expect(events[0].type).toBe(FileChangeType.Deleted);
      }),
      { numRuns: 100 },
    );
  });

  it('createDirectory fires a Created event', () => {
    fc.assert(
      fc.asyncProperty(fc.uuid(), async (folderId) => {
        const cache = new MetadataCache(0);
        const mockApi = createMockApi();
        const provider = new BrightchainFSProvider(mockApi, cache);

        const events: { type: FileChangeType }[] = [];
        provider.onDidChangeFile((e) => events.push(...e));

        const uri = toFolderUri(folderId);

        await provider.createDirectory(uri);

        expect(events.length).toBe(1);
        expect(events[0].type).toBe(FileChangeType.Created);
      }),
      { numRuns: 100 },
    );
  });
});
