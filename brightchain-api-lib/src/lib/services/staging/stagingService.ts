/**
 * StagingService — Core lifecycle service for temporary upload staging.
 *
 * Manages the staging lifecycle: stage files to a local filesystem directory,
 * read them back for preview, remove them on commit/discard, and find expired
 * records for cleanup. All state lives on the filesystem (JSON sidecar files
 * alongside raw file bytes), making the service stateless and multi-instance safe.
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 4.1, 5.1, 7.3, 7.4, 7.5, 7.6
 */

import type {
  IStagedFileRecord,
  IStagingConfig,
} from '@brightchain/brightchain-lib';
import { constants as fsConstants } from 'fs';
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'fs/promises';
import { join } from 'path';

// ─── Dependency Injection ───────────────────────────────────────────────────

/**
 * Injectable dependencies for StagingService.
 * Allows deterministic testing by controlling token generation and time.
 */
export interface IStagingServiceDeps {
  /** Generate a UUID v4 commit token */
  generateToken: () => string;
  /** Get current time (injectable for testing) */
  now: () => Date;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class StagingService {
  constructor(
    private readonly config: IStagingConfig,
    private readonly deps: IStagingServiceDeps,
  ) {}

  /**
   * Ensure the staging directory exists and is writable.
   * Creates the directory recursively if it does not exist.
   */
  async initialize(): Promise<void> {
    await mkdir(this.config.stagingDir, { recursive: true });
    // Verify the directory is writable
    await access(this.config.stagingDir, fsConstants.W_OK);
  }

  /**
   * Stage a file: write raw bytes and an atomic JSON sidecar, return the record.
   *
   * @param fileBuffer   - Raw file bytes
   * @param originalFilename - Original filename from the upload
   * @param mimeType     - MIME type of the uploaded file
   * @param uploaderId   - ID of the user who uploaded the file
   * @param ttlSeconds   - Optional TTL in seconds (capped at maxTtlSeconds)
   * @returns The staged file record
   */
  async stage(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    uploaderId: string,
    ttlSeconds?: number,
  ): Promise<IStagedFileRecord> {
    const commitToken = this.deps.generateToken();
    const now = this.deps.now();

    // Compute effective TTL: use requested value capped at max, or default
    const effectiveTtl =
      ttlSeconds !== undefined
        ? Math.min(ttlSeconds, this.config.maxTtlSeconds)
        : this.config.defaultTtlSeconds;

    const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);

    const record: IStagedFileRecord = {
      commitToken,
      originalFilename,
      mimeType,
      sizeBytes: fileBuffer.length,
      uploadedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      uploaderId,
    };

    const filePath = join(this.config.stagingDir, commitToken);
    const sidecarPath = join(
      this.config.stagingDir,
      `${commitToken}.meta.json`,
    );
    const tempSidecarPath = join(
      this.config.stagingDir,
      `${commitToken}.meta.json.tmp`,
    );

    // Write raw file bytes
    await writeFile(filePath, fileBuffer);

    // Write sidecar atomically: write to temp file, then rename
    await writeFile(tempSidecarPath, JSON.stringify(record, null, 2), 'utf-8');
    await rename(tempSidecarPath, sidecarPath);

    return record;
  }

  /**
   * Get a staged file record by commit token.
   * Returns null if the sidecar is not found or the raw file is missing (orphan handling).
   */
  async getRecord(commitToken: string): Promise<IStagedFileRecord | null> {
    const sidecarPath = join(
      this.config.stagingDir,
      `${commitToken}.meta.json`,
    );
    const filePath = join(this.config.stagingDir, commitToken);

    try {
      const data = await readFile(sidecarPath, 'utf-8');
      const record: IStagedFileRecord = JSON.parse(data);

      // Check that the raw file also exists (handle orphaned sidecar)
      try {
        await access(filePath, fsConstants.F_OK);
      } catch {
        // Raw file missing — treat as not found, clean up orphaned sidecar
        await this.safeUnlink(sidecarPath);
        return null;
      }

      return record;
    } catch {
      // Sidecar missing — check if raw file exists (orphaned raw file)
      try {
        await access(filePath, fsConstants.F_OK);
        // Raw file exists without sidecar — clean up orphaned raw file
        await this.safeUnlink(filePath);
      } catch {
        // Neither file exists — nothing to clean up
      }
      return null;
    }
  }

  /**
   * Read staged file bytes by commit token.
   * Throws if the file does not exist.
   */
  async readFile(commitToken: string): Promise<Buffer> {
    const filePath = join(this.config.stagingDir, commitToken);
    return readFile(filePath);
  }

  /**
   * Delete a staged file and its sidecar.
   * Handles missing files gracefully (file may already be cleaned up).
   */
  async remove(commitToken: string): Promise<void> {
    const filePath = join(this.config.stagingDir, commitToken);
    const sidecarPath = join(
      this.config.stagingDir,
      `${commitToken}.meta.json`,
    );

    await Promise.all([
      this.safeUnlink(filePath),
      this.safeUnlink(sidecarPath),
    ]);
  }

  /**
   * Scan the staging directory for expired records.
   * Reads all `.meta.json` sidecar files, parses each, and filters by expiry.
   */
  async findExpired(): Promise<IStagedFileRecord[]> {
    const entries = await readdir(this.config.stagingDir);
    const sidecarFiles = entries.filter((name) => name.endsWith('.meta.json'));

    const expired: IStagedFileRecord[] = [];

    for (const sidecarFile of sidecarFiles) {
      try {
        const sidecarPath = join(this.config.stagingDir, sidecarFile);
        const data = await readFile(sidecarPath, 'utf-8');
        const record: IStagedFileRecord = JSON.parse(data);

        if (this.isExpired(record)) {
          expired.push(record);
        }
      } catch {
        // Skip unparseable sidecar files — they'll be cleaned up eventually
        continue;
      }
    }

    return expired;
  }

  /**
   * Check if a record is expired by comparing expiresAt against the current time.
   */
  isExpired(record: IStagedFileRecord): boolean {
    const expiresAt = new Date(record.expiresAt).getTime();
    const now = this.deps.now().getTime();
    return expiresAt < now;
  }

  /**
   * Safely delete a file, ignoring ENOENT errors (file already removed).
   */
  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      // Node.js filesystem errors carry a `code` property.
      // Use a broad check to handle both Error subclasses and
      // system-error objects that may not pass `instanceof Error`
      // in certain ESM/CJS interop scenarios.
      const errCode = (error as NodeJS.ErrnoException)?.code;
      if (errCode === 'ENOENT') {
        return; // File already gone — that's fine
      }
      throw error;
    }
  }
}
