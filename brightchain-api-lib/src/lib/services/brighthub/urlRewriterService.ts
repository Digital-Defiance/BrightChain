/**
 * UrlRewriterService — Scans post content for staging URLs, commits each
 * staged image to the vault, and rewrites the content with permanent URLs.
 *
 * Handles:
 * - External image URL stripping
 * - Staging token extraction and validation (≤ 20 images)
 * - Image processing (EXIF strip, resize if > 4096px)
 * - Vault container creation (hub or user scoped)
 * - Atomic commit with best-effort rollback on partial failure
 * - Media attachment record construction
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 10.1, 10.2, 10.3, 10.4
 */

import type { ICommitResponse } from '@brightchain/brightchain-lib';
import {
  IBaseMediaAttachment,
  PostErrorCode,
  PostServiceError,
  extractStagingTokens,
  getHubImageContainerName,
  getMaxImageDimension,
  getMaxInlineImages,
  getUserImageContainerName,
  stripExternalImageUrls,
} from '@brightchain/brighthub-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import sharp from 'sharp';
import {
  isSupportedImageType,
  processImage,
} from '../../utils/stagingImageProcessor';
import type { StagingService } from '../staging/stagingService';

// ─── Checksum ───────────────────────────────────────────────────────────────

/**
 * DJB2-style checksum matching the default used by the upload service.
 * Must produce the same output as digitalburnbag-lib's computeChecksum.
 */
function djb2Checksum(data: Uint8Array): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ─── Dependency Injection ───────────────────────────────────────────────────

/**
 * Injectable dependencies for UrlRewriterService.
 * Mirrors the vault interaction pattern from TempUploadController,
 * keeping the service testable with mock implementations.
 */
export interface IUrlRewriterDeps {
  stagingService: StagingService;
  vaultContainerService: {
    createContainer(params: {
      name: string;
      ownerId: PlatformID;
      visibility?: string;
    }): Promise<{ id: PlatformID; rootFolderId: PlatformID }>;
    listContainers(
      ownerId: PlatformID,
    ): Promise<Array<{ container: { id: PlatformID; name: string; rootFolderId: PlatformID } }>>;
  };
  uploadService: {
    createSession(params: {
      userId: PlatformID;
      fileName: string;
      mimeType: string;
      totalSizeBytes: number;
      targetFolderId: PlatformID;
      vaultContainerId: PlatformID;
    }): Promise<{ id: PlatformID }>;
    receiveChunk(
      sessionId: PlatformID,
      chunkIndex: number,
      data: Uint8Array,
      checksum: string,
    ): Promise<unknown>;
    finalize(sessionId: PlatformID): Promise<{
      id: PlatformID;
      vaultContainerId: PlatformID;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  };
  fileService: {
    softDelete(fileId: PlatformID, requesterId: PlatformID): Promise<void>;
  };
  parseId: (idString: string) => PlatformID;
}

// ─── Result Types ───────────────────────────────────────────────────────────

/**
 * Result of rewriting post content.
 */
export interface IRewriteResult {
  /** Content with staging URLs replaced by permanent URLs */
  rewrittenContent: string;
  /** Media attachment records for each committed image */
  mediaAttachments: IBaseMediaAttachment<string>[];
}

/**
 * Internal tracking for a committed image during the rewrite loop.
 */
interface CommittedImage {
  token: string;
  commitResponse: ICommitResponse<string>;
  width?: number;
  height?: number;
  altText?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class UrlRewriterService {
  constructor(
    private readonly deps: IUrlRewriterDeps,
    private readonly onImageCommitted?: (
      fileId: string,
      meta: { mimeType: string; authorId: string; vaultContainerId: string },
    ) => void,
  ) {}

  /**
   * Rewrite staging URLs in post content to permanent vault URLs.
   *
   * Algorithm:
   * 1. Strip external image URLs (not staging or permanent)
   * 2. Extract staging tokens
   * 3. Validate count ≤ getMaxInlineImages()
   * 4. For each staging token: read, process, commit, collect metadata
   * 5. Replace staging URLs with permanent URLs in content
   * 6. On any commit failure: roll back all previously committed images
   *
   * @param content - Raw post content with staging URLs
   * @param hubId - Hub ID (null for top-level posts)
   * @param userId - Author's user ID
   * @param existingContainerId - Existing vault container ID (if hub already has one)
   * @returns Rewritten content and media attachment records
   */
  async rewriteContent(
    content: string,
    hubId: string | null,
    userId: string,
    existingContainerId?: string,
  ): Promise<IRewriteResult> {
    // 1. Strip external image URLs
    content = stripExternalImageUrls(content);

    // 2. Extract staging tokens
    const stagingTokens = extractStagingTokens(content);

    // 3. Validate count
    if (stagingTokens.length > getMaxInlineImages()) {
      throw new PostServiceError(
        PostErrorCode.TooManyInlineImages,
        `Post contains ${stagingTokens.length} inline images, maximum is ${getMaxInlineImages()}`,
      );
    }

    // 4. Early return if no staging URLs
    if (stagingTokens.length === 0) {
      return { rewrittenContent: content, mediaAttachments: [] };
    }

    // 5. Commit each staged image
    const committedImages: CommittedImage[] = [];
    let cachedContainerId: string | undefined = existingContainerId;

    for (const token of stagingTokens) {
      try {
        const committed = await this.commitStagedImage(
          token,
          hubId,
          userId,
          cachedContainerId,
          content,
        );
        committedImages.push(committed);

        // Cache the container ID after first commit for subsequent images
        if (!cachedContainerId) {
          cachedContainerId = committed.commitResponse.vaultContainerId;
        }
      } catch (error) {
        // Rollback all previously committed images (best-effort)
        await this.rollbackCommittedImages(committedImages, userId);

        // Re-throw PostServiceError as-is, wrap others
        if (error instanceof PostServiceError) {
          throw error;
        }
        throw new PostServiceError(
          PostErrorCode.ImageCommitFailed,
          `Failed to commit image for staging token ${token}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // 6. Replace staging URLs with permanent URLs
    let rewrittenContent = content;
    for (const committed of committedImages) {
      const stagingUrlRegex = new RegExp(
        `/api/temp-upload/${this.escapeRegex(committed.token)}/preview`,
        'gi',
      );
      const permanentUrl = `/api/post-images/${committed.commitResponse.fileId}`;
      rewrittenContent = rewrittenContent.replace(
        stagingUrlRegex,
        permanentUrl,
      );
    }

    // 7. Build media attachment records
    const mediaAttachments = committedImages.map((committed) =>
      this.buildMediaAttachment(committed),
    );

    // 8. Notify registry of committed images (for PostImageController serving)
    if (this.onImageCommitted) {
      for (const committed of committedImages) {
        this.onImageCommitted(committed.commitResponse.fileId, {
          mimeType: committed.commitResponse.mimeType,
          authorId: userId,
          vaultContainerId: committed.commitResponse.vaultContainerId,
        });
      }
    }

    return { rewrittenContent, mediaAttachments };
  }

  /**
   * Commit a single staged image to the vault.
   *
   * Steps:
   * a. Read staging record and validate
   * b. Read file bytes
   * c. Get image metadata (dimensions) via sharp
   * d. Determine processing params (EXIF strip, resize if needed)
   * e. Process image
   * f. Commit to vault (create container if needed)
   */
  private async commitStagedImage(
    token: string,
    hubId: string | null,
    userId: string,
    cachedContainerId: string | undefined,
    content: string,
  ): Promise<CommittedImage> {
    const { stagingService } = this.deps;

    // a. Read staging record
    const record = await stagingService.getRecord(token);
    if (!record) {
      throw new PostServiceError(
        PostErrorCode.StagedImageExpired,
        `Staged image not found for token ${token} — it may have expired. Please re-upload.`,
      );
    }

    // b. Check expiry
    if (stagingService.isExpired(record)) {
      throw new PostServiceError(
        PostErrorCode.StagedImageExpired,
        `Staged image has expired for token ${token}. Please re-upload.`,
      );
    }

    // c. Read file bytes
    const fileBuffer = await stagingService.readFile(token);

    // d. Get image metadata via sharp for dimensions
    const metadata = await sharp(fileBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // e. Determine processing params
    const needsResize =
      (originalWidth !== undefined && originalWidth > getMaxImageDimension()) ||
      (originalHeight !== undefined && originalHeight > getMaxImageDimension());

    let processedBuffer = fileBuffer;
    let processedMimeType = record.mimeType;

    if (isSupportedImageType(record.mimeType)) {
      const processingParams = {
        stripExif: true,
        ...(needsResize
          ? {
              width: Math.min(
                originalWidth ?? getMaxImageDimension(),
                getMaxImageDimension(),
              ),
              height: Math.min(
                originalHeight ?? getMaxImageDimension(),
                getMaxImageDimension(),
              ),
            }
          : {}),
      };

      const processed = await processImage(fileBuffer, processingParams);
      processedBuffer = processed.buffer;
      processedMimeType = processed.mimeType;
    }

    // Get final dimensions from the processed image
    const finalMetadata = await sharp(processedBuffer).metadata();
    const finalWidth = finalMetadata.width;
    const finalHeight = finalMetadata.height;

    // f. Commit to vault
    const commitResponse = await this.commitToVault(
      processedBuffer,
      processedMimeType,
      record.originalFilename,
      userId,
      hubId,
      cachedContainerId,
    );

    // Extract alt text from the markdown for this token
    const altText = this.extractAltTextForToken(content, token);

    return {
      token,
      commitResponse,
      width: finalWidth,
      height: finalHeight,
      altText: altText || undefined,
    };
  }

  /**
   * Commit a processed image buffer to the vault.
   *
   * If no cached container ID is available, creates a new container:
   * - Hub posts: `hub-{hubId}-images`
   * - Top-level posts: `user-{userId}-post-images`
   */
  private async commitToVault(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
    userId: string,
    hubId: string | null,
    cachedContainerId: string | undefined,
  ): Promise<ICommitResponse<string>> {
    const { vaultContainerService, uploadService, parseId } = this.deps;

    let vaultContainerId: PlatformID;
    let targetFolderId: PlatformID;

    if (cachedContainerId) {
      // Use existing container
      vaultContainerId = parseId(cachedContainerId);
      targetFolderId = vaultContainerId; // root folder
    } else {
      // Create or find existing container
      const containerName = hubId
        ? getHubImageContainerName(hubId)
        : getUserImageContainerName(userId);

      try {
        const container = await vaultContainerService.createContainer({
          name: containerName,
          ownerId: parseId(userId),
          visibility: 'public',
        });
        vaultContainerId = container.id;
        targetFolderId = container.rootFolderId;
      } catch (createErr) {
        // If the container already exists, look it up
        const isDuplicate =
          createErr instanceof Error &&
          (createErr.constructor.name === 'DuplicateVaultContainerNameError' ||
            createErr.message.includes('already exists'));

        if (!isDuplicate) throw createErr;

        // Find the existing container by name
        const existing = await vaultContainerService.listContainers(
          parseId(userId),
        );
        const match = existing.find((c) => c.container.name === containerName);
        if (!match) {
          throw new PostServiceError(
            PostErrorCode.ImageCommitFailed,
            `Container "${containerName}" reported as duplicate but could not be found`,
          );
        }
        vaultContainerId = match.container.id;
        targetFolderId = match.container.rootFolderId ?? match.container.id;
      }
    }

    // Upload via the chunked upload pipeline
    const session = await uploadService.createSession({
      userId: parseId(userId),
      fileName,
      mimeType,
      totalSizeBytes: fileBuffer.length,
      targetFolderId,
      vaultContainerId,
    });

    const checksum = djb2Checksum(new Uint8Array(fileBuffer));

    // Send the file in chunks matching the upload service's expected chunk
    // size. The session calculates totalChunks from totalSizeBytes and its
    // internal chunkSizeBytes (default 1 MB). Sending the entire buffer as
    // a single chunk only works when the file fits in one chunk.
    const chunkSize = 1 * 1024 * 1024; // 1 MB — matches DEFAULT_CHUNK_SIZE_BYTES
    const totalChunks = Math.max(1, Math.ceil(fileBuffer.length / chunkSize));

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileBuffer.length);
      const chunkData = new Uint8Array(fileBuffer.subarray(start, end));
      const chunkChecksum = djb2Checksum(chunkData);
      await uploadService.receiveChunk(
        session.id,
        i,
        chunkData,
        chunkChecksum,
      );
    }

    const fileMetadata = await uploadService.finalize(session.id);

    return {
      fileId: fileMetadata.id.toString(),
      vaultContainerId: fileMetadata.vaultContainerId.toString(),
      fileName: fileMetadata.fileName,
      mimeType: fileMetadata.mimeType,
      sizeBytes: fileMetadata.sizeBytes,
    };
  }

  /**
   * Best-effort rollback: soft-delete all previously committed images.
   * Errors during rollback are silently ignored — the staged files remain
   * intact so the author can retry.
   */
  private async rollbackCommittedImages(
    committedImages: CommittedImage[],
    userId: string,
  ): Promise<void> {
    const { fileService, parseId } = this.deps;

    for (const committed of committedImages) {
      try {
        await fileService.softDelete(
          parseId(committed.commitResponse.fileId),
          parseId(userId),
        );
      } catch {
        // Best-effort — ignore rollback failures
      }
    }
  }

  /**
   * Build an IBaseMediaAttachment record from a committed image.
   */
  private buildMediaAttachment(
    committed: CommittedImage,
  ): IBaseMediaAttachment<string> {
    const permanentUrl = `/api/post-images/${committed.commitResponse.fileId}`;

    return {
      _id: committed.commitResponse.fileId,
      url: permanentUrl,
      mimeType: committed.commitResponse.mimeType,
      size: committed.commitResponse.sizeBytes,
      width: committed.width,
      height: committed.height,
      altText: committed.altText,
    };
  }

  /**
   * Extract the alt text from markdown image syntax for a specific staging token.
   * Looks for `![alt text](/api/temp-upload/{token}/preview)` in the content.
   */
  private extractAltTextForToken(
    content: string,
    token: string,
  ): string | null {
    const escapedToken = this.escapeRegex(token);
    const regex = new RegExp(
      `!\\[([^\\]]*)\\]\\(/api/temp-upload/${escapedToken}/preview\\)`,
      'i',
    );
    const match = regex.exec(content);
    return match ? match[1] : null;
  }

  /**
   * Escape special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
