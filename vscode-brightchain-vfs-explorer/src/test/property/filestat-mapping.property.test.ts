/**
 * Feature: brightchain-vfs-explorer, Property 11: File metadata maps correctly to VS Code FileStat
 *
 * For any `IFileMetadataDTO` with valid `sizeBytes`, `createdAt`, and
 * `updatedAt` fields, the FSProvider's `stat` implementation should return a
 * `FileStat` where `type === FileType.File`, `size` equals `sizeBytes`,
 * `ctime` equals the epoch-ms of `createdAt`, and `mtime` equals the
 * epoch-ms of `updatedAt`.
 *
 * **Validates: Requirements 6.5**
 */

import fc from 'fast-check';
import { FileType } from 'vscode';
import type { ApiClient } from '../../api/api-client';
import type { IFileMetadataDTO } from '../../api/types';
import { BrightchainFSProvider } from '../../providers/fs-provider';
import { MetadataCache } from '../../services/metadata-cache';
import { toFileUri } from '../../util/uri';

/**
 * Arbitrary for a Date within a reasonable range (2000-01-01 to 2040-01-01)
 * returned as an ISO string, which is what the API returns.
 */
const dateIsoArb: fc.Arbitrary<string> = fc
  .date({
    min: new Date('2000-01-01T00:00:00Z'),
    max: new Date('2040-01-01T00:00:00Z'),
  })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

/**
 * Arbitrary for sizeBytes: non-negative integer up to 10 GB.
 */
const sizeBytesArb = fc.nat({ max: 10_000_000_000 });

/**
 * Arbitrary for a minimal IFileMetadataDTO with the fields that matter
 * for stat mapping.
 */
const fileMetadataArb: fc.Arbitrary<IFileMetadataDTO> = fc
  .record({
    id: fc.uuid(),
    sizeBytes: sizeBytesArb,
    createdAt: dateIsoArb,
    updatedAt: dateIsoArb,
    fileName: fc
      .string({ minLength: 1, maxLength: 40 })
      .filter((s) => !s.includes('/')),
  })
  .map((r) => ({
    id: r.id,
    ownerId: 'owner-stub',
    folderId: 'folder-stub',
    fileName: r.fileName,
    mimeType: 'application/octet-stream',
    sizeBytes: r.sizeBytes,
    tags: [],
    currentVersionId: 'version-stub',
    quorumGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: 'creator-stub',
    updatedBy: 'updater-stub',
  }));

describe('Property 11: File metadata maps correctly to VS Code FileStat', () => {
  it('stat returns FileStat with correct type, size, ctime, and mtime for file URIs', () => {
    fc.assert(
      fc.asyncProperty(fileMetadataArb, async (meta: IFileMetadataDTO) => {
        // Fresh cache so nothing is pre-cached
        const cache = new MetadataCache(0);

        // Mock ApiClient with getFileMetadata returning the generated DTO
        const mockApi = {
          getFileMetadata: jest.fn().mockResolvedValue(meta),
        } as unknown as ApiClient;

        const provider = new BrightchainFSProvider(mockApi, cache);
        const uri = toFileUri(meta.id, meta.fileName);

        const stat = await provider.stat(uri);

        expect(stat.type).toBe(FileType.File);
        expect(stat.size).toBe(meta.sizeBytes);
        expect(stat.ctime).toBe(new Date(meta.createdAt).getTime());
        expect(stat.mtime).toBe(new Date(meta.updatedAt).getTime());
      }),
      { numRuns: 100 },
    );
  });
});
