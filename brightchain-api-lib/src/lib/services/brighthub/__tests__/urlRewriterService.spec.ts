/**
 * Unit tests for UrlRewriterService.
 *
 * Tests:
 * 1. Happy path: 2 staging URLs → both committed, content rewritten, 2 media attachments
 * 2. Empty content: no staging URLs → returns content unchanged, empty mediaAttachments
 * 3. Rollback on partial failure: 3 staging URLs, 2nd commit fails → first rolled back
 * 4. Expired staging file: isExpired returns true → throws StagedImageExpired
 * 5. Missing staging record: getRecord returns null → throws StagedImageExpired
 * 6. Hub context container creation: hubId provided → hub-{hubId}-images
 * 7. User context container creation: hubId null → user-{userId}-post-images
 * 8. Container ID caching: multiple images → createContainer called only once
 *
 * Requirements: 5.1–5.7, 6.1–6.3, 10.1–10.4
 */

import { PostErrorCode, PostServiceError } from '@brightchain/brighthub-lib';
import {
  UrlRewriterService,
  type IUrlRewriterDeps,
} from '../urlRewriterService';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../../utils/stagingImageProcessor', () => ({
  isSupportedImageType: jest.fn().mockReturnValue(true),
  processImage: jest.fn().mockImplementation(async (buffer: Buffer) => ({
    buffer,
    mimeType: 'image/png',
  })),
}));

jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
  }));
  return mockSharp;
});

// ─── Valid UUID v4 tokens ───────────────────────────────────────────────────

const TOKEN_1 = 'a1b2c3d4-e5f6-4a90-abcd-ef1234567890';
const TOKEN_2 = 'b2c3d4e5-f6a7-4b01-8cde-f12345678901';
const TOKEN_3 = 'c3d4e5f6-a7b8-4c12-9def-012345678902';

// File IDs must be valid UUID v4 so permanent URL regex matches
const FILE_ID_1 = 'f0000001-0000-4000-8000-000000000001';
const FILE_ID_2 = 'f0000002-0000-4000-8000-000000000002';
const FILE_ID_3 = 'f0000003-0000-4000-8000-000000000003';

const MOCK_CONTAINER_ID = 'c0000000-0000-4000-8000-000000000000';
const MOCK_ROOT_FOLDER_ID = 'r0000000-0000-4000-8000-000000000000';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStagingUrl(token: string): string {
  return `/api/temp-upload/${token}/preview`;
}

function makeContent(...tokens: string[]): string {
  return tokens
    .map(
      (token, i) =>
        `Paragraph ${i}.\n\n![image ${i}](${makeStagingUrl(token)})`,
    )
    .join('\n\n');
}

function makeRecord(token: string) {
  return {
    commitToken: token,
    originalFilename: `image-${token}.png`,
    mimeType: 'image/png',
    sizeBytes: 1024,
    uploadedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    uploaderId: 'user-1',
  };
}

const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Create mock deps with deterministic file IDs for each session.
 * fileIds array maps session index → file ID.
 */
function createMockDeps(
  overrides?: Partial<{
    getRecord: jest.Mock;
    isExpired: jest.Mock;
    readFile: jest.Mock;
    createContainer: jest.Mock;
    createSession: jest.Mock;
    receiveChunk: jest.Mock;
    finalize: jest.Mock;
    softDelete: jest.Mock;
    fileIds: string[];
  }>,
): IUrlRewriterDeps {
  const fileIds = overrides?.fileIds ?? [FILE_ID_1, FILE_ID_2, FILE_ID_3];
  let sessionCounter = 0;

  return {
    stagingService: {
      getRecord:
        overrides?.getRecord ??
        jest
          .fn()
          .mockImplementation((token: string) =>
            Promise.resolve(makeRecord(token)),
          ),
      isExpired: overrides?.isExpired ?? jest.fn().mockReturnValue(false),
      readFile: overrides?.readFile ?? jest.fn().mockResolvedValue(MINIMAL_PNG),
    } as unknown as IUrlRewriterDeps['stagingService'],

    vaultContainerService: {
      createContainer:
        overrides?.createContainer ??
        jest.fn().mockResolvedValue({
          id: MOCK_CONTAINER_ID,
          rootFolderId: MOCK_ROOT_FOLDER_ID,
        }),
    },

    uploadService: {
      createSession:
        overrides?.createSession ??
        jest.fn().mockImplementation(() => {
          const id = `session-${sessionCounter}`;
          sessionCounter++;
          return Promise.resolve({ id });
        }),
      receiveChunk:
        overrides?.receiveChunk ?? jest.fn().mockResolvedValue(undefined),
      finalize:
        overrides?.finalize ??
        jest.fn().mockImplementation(() => {
          const idx = sessionCounter - 1;
          const fileId = fileIds[idx] ?? `fallback-file-${idx}`;
          return Promise.resolve({
            id: fileId,
            vaultContainerId: MOCK_CONTAINER_ID,
            fileName: `image-${fileId}.png`,
            mimeType: 'image/png',
            sizeBytes: 1024,
          });
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

describe('UrlRewriterService', () => {
  // ── 1. Happy path ───────────────────────────────────────────────────────

  describe('happy path: 2 staging URLs committed and rewritten', () => {
    it('should commit both images, rewrite content, and return 2 media attachments', async () => {
      const deps = createMockDeps();
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1, TOKEN_2);

      const result = await service.rewriteContent(content, 'hub-1', 'user-1');

      // Content should have no staging URLs
      expect(result.rewrittenContent).not.toContain('/api/temp-upload/');

      // Content should have 2 permanent URLs
      expect(result.rewrittenContent).toContain(
        `/api/post-images/${FILE_ID_1}`,
      );
      expect(result.rewrittenContent).toContain(
        `/api/post-images/${FILE_ID_2}`,
      );

      // Non-image text preserved
      expect(result.rewrittenContent).toContain('Paragraph 0.');
      expect(result.rewrittenContent).toContain('Paragraph 1.');

      // 2 media attachments
      expect(result.mediaAttachments).toHaveLength(2);

      // First attachment
      expect(result.mediaAttachments[0]._id).toBe(FILE_ID_1);
      expect(result.mediaAttachments[0].url).toBe(
        `/api/post-images/${FILE_ID_1}`,
      );
      expect(result.mediaAttachments[0].mimeType).toBe('image/png');
      expect(result.mediaAttachments[0].size).toBe(1024);

      // Second attachment
      expect(result.mediaAttachments[1]._id).toBe(FILE_ID_2);
      expect(result.mediaAttachments[1].url).toBe(
        `/api/post-images/${FILE_ID_2}`,
      );
    });
  });

  // ── 2. Empty content ──────────────────────────────────────────────────

  describe('empty content: no staging URLs', () => {
    it('should return content unchanged with empty mediaAttachments', async () => {
      const deps = createMockDeps();
      const service = new UrlRewriterService(deps);
      const content = 'Hello world, no images here.';

      const result = await service.rewriteContent(content, 'hub-1', 'user-1');

      expect(result.rewrittenContent).toBe(content);
      expect(result.mediaAttachments).toHaveLength(0);

      // No staging service calls should have been made
      expect(deps.stagingService.getRecord).not.toHaveBeenCalled();
    });
  });

  // ── 3. Rollback on partial failure ────────────────────────────────────

  describe('rollback on partial commit failure', () => {
    it('should roll back the first committed image when the 2nd of 3 fails', async () => {
      let sessionIdx = 0;
      const finalizeMock = jest.fn().mockImplementation(() => {
        const idx = sessionIdx;
        sessionIdx++;
        if (idx === 1) {
          // 2nd image fails
          return Promise.reject(new Error('Vault upload failed'));
        }
        const fileId = [FILE_ID_1, FILE_ID_2, FILE_ID_3][idx];
        return Promise.resolve({
          id: fileId,
          vaultContainerId: MOCK_CONTAINER_ID,
          fileName: `image-${fileId}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
        });
      });

      const softDeleteMock = jest.fn().mockResolvedValue(undefined);

      const deps = createMockDeps({
        finalize: finalizeMock,
        softDelete: softDeleteMock,
      });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1, TOKEN_2, TOKEN_3);

      await expect(
        service.rewriteContent(content, 'hub-1', 'user-1'),
      ).rejects.toThrow(PostServiceError);

      try {
        await service.rewriteContent(content, 'hub-1', 'user-1');
      } catch (error) {
        expect((error as PostServiceError).code).toBe(
          PostErrorCode.ImageCommitFailed,
        );
      }

      // The first committed image should have been rolled back via softDelete
      expect(softDeleteMock).toHaveBeenCalledWith(FILE_ID_1, 'user-1');
    });
  });

  // ── 4. Expired staging file ───────────────────────────────────────────

  describe('expired staging file', () => {
    it('should throw StagedImageExpired when isExpired returns true', async () => {
      const deps = createMockDeps({
        isExpired: jest.fn().mockReturnValue(true),
      });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      await expect(
        service.rewriteContent(content, 'hub-1', 'user-1'),
      ).rejects.toThrow(PostServiceError);

      try {
        await service.rewriteContent(content, 'hub-1', 'user-1');
      } catch (error) {
        expect((error as PostServiceError).code).toBe(
          PostErrorCode.StagedImageExpired,
        );
        expect((error as PostServiceError).message).toContain('expired');
      }
    });
  });

  // ── 5. Missing staging record ─────────────────────────────────────────

  describe('missing staging record', () => {
    it('should throw StagedImageExpired when getRecord returns null', async () => {
      const deps = createMockDeps({
        getRecord: jest.fn().mockResolvedValue(null),
      });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      await expect(
        service.rewriteContent(content, 'hub-1', 'user-1'),
      ).rejects.toThrow(PostServiceError);

      try {
        await service.rewriteContent(content, 'hub-1', 'user-1');
      } catch (error) {
        expect((error as PostServiceError).code).toBe(
          PostErrorCode.StagedImageExpired,
        );
        expect((error as PostServiceError).message).toContain('not found');
      }
    });
  });

  // ── 6. Hub context container creation ─────────────────────────────────

  describe('hub context container creation', () => {
    it('should create container with name hub-{hubId}-images when hubId is provided', async () => {
      const createContainerMock = jest.fn().mockResolvedValue({
        id: MOCK_CONTAINER_ID,
        rootFolderId: MOCK_ROOT_FOLDER_ID,
      });

      const deps = createMockDeps({ createContainer: createContainerMock });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      await service.rewriteContent(content, 'my-hub-42', 'user-1');

      expect(createContainerMock).toHaveBeenCalledTimes(1);
      expect(createContainerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'hub-my-hub-42-images',
        }),
      );
    });
  });

  // ── 7. User context container creation ────────────────────────────────

  describe('user context container creation', () => {
    it('should create container with name user-{userId}-post-images when hubId is null', async () => {
      const createContainerMock = jest.fn().mockResolvedValue({
        id: MOCK_CONTAINER_ID,
        rootFolderId: MOCK_ROOT_FOLDER_ID,
      });

      const deps = createMockDeps({ createContainer: createContainerMock });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1);

      await service.rewriteContent(content, null, 'user-77');

      expect(createContainerMock).toHaveBeenCalledTimes(1);
      expect(createContainerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user-user-77-post-images',
        }),
      );
    });
  });

  // ── 8. Container ID caching ───────────────────────────────────────────

  describe('container ID caching', () => {
    it('should call createContainer only once for multiple images', async () => {
      const createContainerMock = jest.fn().mockResolvedValue({
        id: MOCK_CONTAINER_ID,
        rootFolderId: MOCK_ROOT_FOLDER_ID,
      });

      const deps = createMockDeps({ createContainer: createContainerMock });
      const service = new UrlRewriterService(deps);
      const content = makeContent(TOKEN_1, TOKEN_2, TOKEN_3);

      const result = await service.rewriteContent(content, 'hub-1', 'user-1');

      // Container created only once despite 3 images
      expect(createContainerMock).toHaveBeenCalledTimes(1);

      // All 3 images should still be committed successfully
      expect(result.mediaAttachments).toHaveLength(3);
    });
  });
});
