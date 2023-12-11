/**
 * Unit tests for UrlRewriterService — duplicate container handling and DJB2 checksum.
 *
 * Tests:
 * 1. DJB2 checksum is used (not SHA-256) when uploading chunks
 * 2. Duplicate container error is handled by looking up the existing container
 * 3. Non-duplicate container creation errors are re-thrown as PostServiceError
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { PostServiceError } from '@brightchain/brighthub-lib';
import {
  UrlRewriterService,
  type IUrlRewriterDeps,
} from '../urlRewriterService';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
    resize: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
  });
  return mockSharp;
});

jest.mock('../../../utils/stagingImageProcessor', () => ({
  isSupportedImageType: jest.fn().mockReturnValue(true),
  processImage: jest.fn().mockResolvedValue({
    buffer: Buffer.from('processed-image'),
    width: 100,
    height: 100,
  }),
}));

// ─── Constants ──────────────────────────────────────────────────────────────

const TOKEN_1 = 'a1b2c3d4-e5f6-4a90-abcd-ef1234567890';
const FILE_ID_1 = 'f0000001-0000-4000-8000-000000000001';
const MOCK_CONTAINER_ID = 'c0000000-0000-4000-8000-000000000000';
const MOCK_ROOT_FOLDER_ID = 'r0000000-0000-4000-8000-000000000000';

// ─── DJB2 reference implementation ─────────────────────────────────────────

/**
 * Reference DJB2 checksum — mirrors the function at the top of urlRewriterService.ts.
 */
function djb2Checksum(data: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStagingUrl(token: string): string {
  return `/api/temp-upload/${token}/preview`;
}

function makeContent(token: string): string {
  return `Some text.\n\n![test image](${makeStagingUrl(token)})`;
}

function makeStagingRecord() {
  return {
    commitToken: 'token-1',
    uploaderId: 'user-1',
    mimeType: 'image/png',
    sizeBytes: 100,
    filePath: '/tmp/test',
    originalFilename: 'test.png',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  };
}

function createMockDeps(
  overrides?: Partial<{
    getRecord: jest.Mock;
    isExpired: jest.Mock;
    readFile: jest.Mock;
    remove: jest.Mock;
    createContainer: jest.Mock;
    listContainers: jest.Mock;
    createSession: jest.Mock;
    receiveChunk: jest.Mock;
    finalize: jest.Mock;
    softDelete: jest.Mock;
  }>,
): IUrlRewriterDeps {
  return {
    stagingService: {
      getRecord:
        overrides?.getRecord ??
        jest.fn().mockResolvedValue(makeStagingRecord()),
      isExpired: overrides?.isExpired ?? jest.fn().mockReturnValue(false),
      readFile:
        overrides?.readFile ??
        jest.fn().mockResolvedValue(Buffer.from('test-image-data')),
      remove: overrides?.remove ?? jest.fn().mockResolvedValue(undefined),
    } as unknown as IUrlRewriterDeps['stagingService'],

    vaultContainerService: {
      createContainer:
        overrides?.createContainer ??
        jest.fn().mockResolvedValue({
          id: MOCK_CONTAINER_ID,
          rootFolderId: MOCK_ROOT_FOLDER_ID,
        }),
      listContainers:
        overrides?.listContainers ?? jest.fn().mockResolvedValue([]),
    },

    uploadService: {
      createSession:
        overrides?.createSession ??
        jest.fn().mockResolvedValue({ id: 'session-0' }),
      receiveChunk:
        overrides?.receiveChunk ?? jest.fn().mockResolvedValue(undefined),
      finalize:
        overrides?.finalize ??
        jest.fn().mockResolvedValue({
          id: FILE_ID_1,
          vaultContainerId: MOCK_CONTAINER_ID,
          fileName: 'test.png',
          mimeType: 'image/png',
          sizeBytes: 100,
        }),
    },

    fileService: {
      softDelete:
        overrides?.softDelete ?? jest.fn().mockResolvedValue(undefined),
    },

    parseId: jest.fn().mockImplementation((id: string) => id),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UrlRewriterService — container handling & checksum', () => {
  // ── 1. DJB2 checksum is used (not SHA-256) ────────────────────────────

  describe('DJB2 checksum is used (not SHA-256)', () => {
    it('should pass an 8-char hex DJB2 checksum to receiveChunk, not a 64-char SHA-256', async () => {
      const receiveChunkMock = jest.fn().mockResolvedValue(undefined);
      const imageData = Buffer.from('test-image-data');

      const deps = createMockDeps({
        readFile: jest.fn().mockResolvedValue(imageData),
        receiveChunk: receiveChunkMock,
      });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      await service.rewriteContent(content, null, 'user-1');

      // receiveChunk should have been called
      expect(receiveChunkMock).toHaveBeenCalledTimes(1);

      // The 4th argument is the checksum
      const checksumArg = receiveChunkMock.mock.calls[0][3] as string;

      // DJB2 produces 8 hex chars; SHA-256 produces 64
      expect(checksumArg).toMatch(/^[0-9a-f]{8}$/);
      expect(checksumArg).not.toHaveLength(64);

      // Verify it matches the DJB2 algorithm for the same data.
      // processImage mock returns Buffer.from('processed-image'), which is
      // what actually gets committed to the vault.
      const processedBuffer = Buffer.from('processed-image');
      const expectedChecksum = djb2Checksum(new Uint8Array(processedBuffer));
      expect(checksumArg).toBe(expectedChecksum);
    });
  });

  // ── 2. Duplicate container is handled by looking up existing ──────────

  describe('duplicate container is handled by looking up existing', () => {
    it('should fall back to listContainers when createContainer throws "already exists"', async () => {
      const createContainerMock = jest.fn().mockRejectedValue(
        new Error(
          'A vault container named "user-test-post-images" already exists',
        ),
      );

      const listContainersMock = jest.fn().mockResolvedValue([
        {
          container: {
            id: 'existing-id',
            name: 'user-user-1-post-images',
            rootFolderId: 'folder-id',
          },
        },
      ]);

      const deps = createMockDeps({
        createContainer: createContainerMock,
        listContainers: listContainersMock,
      });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      // Should not throw — the duplicate is handled gracefully
      const result = await service.rewriteContent(content, null, 'user-1');

      // listContainers was called to find the existing container
      expect(listContainersMock).toHaveBeenCalledTimes(1);
      expect(listContainersMock).toHaveBeenCalledWith('user-1');

      // The upload succeeded and content was rewritten
      expect(result.rewrittenContent).toContain('/api/post-images/');
      expect(result.rewrittenContent).not.toContain('/api/temp-upload/');
      expect(result.mediaAttachments).toHaveLength(1);
    });
  });

  // ── 3. Non-duplicate container error is re-thrown ─────────────────────

  describe('non-duplicate container error is re-thrown', () => {
    it('should throw PostServiceError when createContainer fails with a non-duplicate error', async () => {
      const createContainerMock = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const listContainersMock = jest.fn();

      const deps = createMockDeps({
        createContainer: createContainerMock,
        listContainers: listContainersMock,
      });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      await expect(
        service.rewriteContent(content, null, 'user-1'),
      ).rejects.toThrow(PostServiceError);

      // listContainers should NOT have been called — the error is not a duplicate
      expect(listContainersMock).not.toHaveBeenCalled();
    });
  });
});
